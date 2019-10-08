# DataWriterClient.js
[![Build Status](https://travis-ci.org/islog/datawriterclient-js.svg?branch=master)](https://travis-ci.org/islog/datawriterclient-js)

DataWriter Web Client JavaScript library

A DataWriter client developed in JavaScript to encode & print RFID/NFC cards through web browsers.

## Getting Started

Once you've added the DataWriterClient.js script to your page, you can use it with:
 * Include JavaScript files
```html
<link rel="stylesheet" type="text/css" href="datawriterclient.min.css">
<script src="datawriterclient.min.js" type="text/javascript"></script>
```
 * And setup the server connection:
```html
<script>
var dwClient = dwjs();
dwClient.init({
	'uri': 'ws://demo.islog.com', // or ws://127.0.0.1:8082 by default on a local server
	'login': 'admin',
	'password': 'admin'
});
</script>
```

## Documentation

## License
Free for use with ISLOG provided servers (eg. ISLOG DataWriter Server).
For details, see [LICENSE](https://github.com/islog/datawriterclient-js/blob/master/LICENSE).

## Release History

 - 0.3.1: Fix NPM package
 - 0.2.0: SSL support
 - 0.1.0: Initial release
