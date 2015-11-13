import Path from 'path';
import Joi from 'joi';
import Fs from 'fs';
import ALCE from 'alce';

const records = Joi.array().min(1).required().items(Joi.object({
  name: Joi.string().required(),
  type: Joi.valid('A', 'AAAA').required(),
  ttl: Joi.number().default(300)
}));

const schema = Joi.object({
  apikey: Joi.string().length(24).alphanum().required(),
  loglevel: Joi.valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('warn'),
  logfile: Joi.string().default(Path.join(process.cwd(), 'gandynode.log')),
  domains: Joi.object({}).min(1).required().pattern(/^.+\..+$/, records),
  removeobsoletezoneversion: Joi.boolean().default(false)
});

export default {
  load(path) {
    try {
      const config = ALCE.parse(Fs.readFileSync(path));
      return Joi.attempt(config, schema);
    } catch (err) {
      console.error('Could not properly read the configuration file :', err.message); // eslint-disable-line no-console
      process.exit(1);
    }
  }
};
