# gandynode

Node.js CLI to update Gandi.net DNS zones to the detected public IP addresses.

Started as a port of [gandyn](https://github.com/Chralu/gandyn/).

## Install

> npm install -g gandynode

## Usage
> $ gandynode --help
>
> Usage: gandynode \<configuration file\>
>
> Options:
>
>   -h, --help      Show help
>   -s, --silent    Silent mode

## Configuration file

Here is the format of the configuration file :

- `apikey`: API key provided by gandi (**required**)
- `loglevel`: allowed values are 'trace', 'debug', 'info', 'warn', 'error', 'fatal'. Defaults to 'warn'.
- `logfile`: path (absolute or relative to cwd) to write the logs. Defaults to 'gandynode.log' (relative to cwd).
- `domains`: hashmap of domains as keys and records as values. (**required**)
    -  domain:
        -  `type`: type of address, allowed values are 'A' (IPv4) and 'AAAA' (IPv6) (**required**)
        -  `name`: name of the record (**required**)
        -  `ttl`: TTL (in seconds) of the record. Defaults to 300.
- `removeobsoletezoneversion`: remove previously active zone version after switching to the updated version. Defaults to `false`.

Example :

```json
{
    "apikey": "XXXXXXXXXXXXXXXXXXXXXXXX",
    "domains": {
        "domain.com": [
            { "type": "A", "name": "ipv4" },
            { "type": "AAAA", "name": "ipv6", "ttl": 10800 }
        ],
        "domain2.com": [
            { "type": "A", "name": "foo" }
        ]
    },
    "loglevel": "info",
    "logfile": "mylog.log",
    "removeobsoletezoneversion": true
}
```

## Notes

The log file should be automatically rotated once a week.

If you run it in a cron, you will probably want to set it to silent mode to avoid any output.

I'm using [bunyan](https://www.npmjs.com/package/bunyan) as logger, you might want to install it as well if you want to read the logs.
