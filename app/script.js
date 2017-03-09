(function () {

'use strict';

var $ = document.querySelector.bind(document);

// IndexedDB

var db = new PouchDB('mythus');

db.info().then(function (info) {
  $('#idb').innerHTML = '&#10004; We can use PouchDB with IndexedDB!';
}).catch(function (err) {
  $('#idb').innerHTML = 'Error for IndexedDB';
});

})();
