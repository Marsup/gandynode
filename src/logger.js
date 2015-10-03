import Bunyan from 'bunyan';
import Path from 'path';

export default {
  create(configuration, options) {
    const streams = [];

    if (!options.silent) {
      const PrettyStream = require('bunyan-prettystream');
      const prettyStdOut = new PrettyStream();
      prettyStdOut.pipe(process.stdout);

      streams.push({
        type: 'raw',
        stream: prettyStdOut,
        level: configuration.loglevel
      });
    }

    if (configuration.logfile) {
      streams.push({
        type: 'rotating-file',
        period: '1w',
        count: 4,
        path: Path.resolve(process.cwd(), configuration.logfile),
        level: configuration.loglevel
      });
    }

    return Bunyan.createLogger({
      name: 'gandynode',
      streams
    });
  }
};
