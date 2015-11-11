import Promise from 'bluebird';
import _ from 'lodash';

import Gandi from 'node-gandi';
import PublicIp from 'public-ip';

import Configuration from './configuration';
import Logger from './logger';

Promise.promisifyAll(Gandi.prototype);
Promise.promisifyAll(PublicIp);

exports.run = async function run(configurationFile, options) {
  const config = Configuration.load(configurationFile);
  const logger = Logger.create(config, {
    silent: options.silent
  });
  const gandi = new Gandi(config.apikey);

  try {
    const IPs = await getPublicIPs(config.domains);
    logger.info('Found public IPs : %j', IPs);

    const domains = Object.keys(config.domains);
    const updateObjects = await* domains.map(domain => buildUpdateObject(IPs, domain));

    for (let update of updateObjects) {
      if (!update.updated) {
        logger.info('Nothing to update on domain %s', update.domain);
        continue;
      }

      await updateDomain(update);
    }
  } catch (err) {
    logger.fatal(err);
    process.exit(1);
  }

  async function getPublicIPs(domains) {
    logger.debug('Resolving external IPs...');
    const types = _.chain(domains)
      .values()
      .flatten()
      .pluck('type')
      .unique()
      .value();

    const IPs = await* types.map(type => type === 'A' ? PublicIp.v4Async() : PublicIp.v6Async());
    return _.zipObject(types, IPs);
  }

  async function buildUpdateObject(IPs, domain) {
    const zoneId = await getDomainZone(domain);
    const currentRecords = await* getRecords(zoneId);

    let updated = false;
    config.domains[domain].forEach((record) => {
      const ip = IPs[record.type];
      const matching = _.findWhere(currentRecords, _.pick(record, ['name', 'type']));

      if (matching) {
        if (matching.value !== ip || matching.ttl !== record.ttl) {
          updated = true;
          logger.info('Will set %s (%s) to IP %s and TTL %ss (previously %s and %ss)', record.name, record.type, ip, record.ttl, matching.value, matching.ttl);
          _.assign(matching, record, {
            value: ip
          });
        }
      } else {
        updated = true;
        const newRecord = _.assign({}, record, {
          value: ip
        });
        logger.info('Will add new record %s (%s) with IP %s and TTL %ss', newRecord.name, newRecord.type, newRecord.value, newRecord.ttl);
        currentRecords.push(newRecord);
      }
    });

    return {
      domain,
      updated,
      zoneId,
      records: currentRecords
    };
  }

  async function getDomainZone(domain) {
    logger.debug('Querying domain information for %s', domain);
    const info = await gandi.callAsync('domain.info', [domain]);
    logger.debug('Zone ID for %s is %s', domain, info.zone_id);
    return info.zone_id;
  }

  async function getRecords(zoneId) {
    return await gandi.callAsync('domain.zone.record.list', [zoneId, 0]);
  }

  async function updateDomain({ domain, zoneId, records }) {
    logger.debug('Creating new zone for %s...', domain);
    let zoneInfo;
    let oldVersion;
    let newVersion;
    try {
      newVersion = await gandi.callAsync('domain.zone.version.new', [zoneId]);
      logger.info('Created zone for %s as version %d', domain, newVersion);

      logger.debug('Updating zone for %s with new settings', domain);
      await gandi.callAsync('domain.zone.record.set', [zoneId, newVersion, records]);

      if(config.removeobsoletezoneversion) {
        logger.debug('Getting current version for zone %s', domain);
        zoneInfo = await gandi.callAsync('domain.zone.info', [zoneId]);
        oldVersion = zoneInfo.version;
        logger.info('Current version for zone %s is %d', domain, oldVersion);
      }

      logger.debug('Enabling zone for %s as version %d', domain, newVersion);
      await gandi.callAsync('domain.zone.version.set', [zoneId, newVersion]);
      logger.info('Enabled zone for %s as version %d', domain, newVersion);

      if(config.removeobsoletezoneversion) {
        logger.debug('Removing obsolete zone %s version %d', domain, oldVersion);
        await gandi.callAsync('domain.zone.version.delete', [zoneId, oldVersion]);
        logger.info('Removed zone %s version %d', domain, oldVersion);
      }

    } catch (err) {
      logger.error('Removing zone %s version %d', domain, newVersion);
      try {
        await gandi.callAsync('domain.zone.version.delete', [zoneId, newVersion]);
      } catch (removeErr) {
        logger.error('Failed to remove zone %s version %d because %s', domain, newVersion, removeErr.message);
        throw err;
      }
      throw err;
    }
  }
};
