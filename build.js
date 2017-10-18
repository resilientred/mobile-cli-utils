var fs = require('fs');
var path = require('path');
var packages=[
    "cordova-android",
    "cordova-browser",
    "cordova-ios",
    "cordova-js",
    "cordova-osx",
    "cordova-ubuntu",
    "cordova-windows",
    "cordova-wp8",
    "ionic-angular",
    "ionicons"	
];
var builder=[
	"cordova-js"
];
var walk = function (dir, done) {
	var results = [];
	fs.readdir(dir, function (err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) return done(null, results);
		list.forEach(function (file) {
			file = path.resolve(dir, file);
			fs.stat(file, function (err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function (err, res) {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				}
				else {
					results.push(file);
					if (!--pending) done(null, results);
				}
			});
		});
	});
};
/**
 * make directory recursively
 * 
 * @function mkdirRecursive
 * @param {String} root - absolute root where append chunks
 * @param {Array} chunks - directories chunks
 * @param {Number} mode - directories mode, see Node documentation
 * @param {Function} callback - next callback
 */
function mkdir(root, mode, callback) {
	function mkdirRecursive(root, chunks, mode, callback) {
		var chunk = chunks.shift();
		if (!chunk) {
			return callback(null);
		}
		var root = path.join(root, chunk);
		return fs.exists(root, function (exists) {
			if (exists === true) { // already done
				return mkdirRecursive(root, chunks, mode, callback);
			}
			return fs.mkdir(root, mode, function (err) {
				if (err) {
					return callback(err);
				}
				return mkdirRecursive(root, chunks, mode, callback); // let's magic
			});
		});
	}
	if (typeof mode === 'function') {
		var callback = mode;
		var mode = null;
	}
	if (typeof root !== 'string') {
		throw new Error('missing root');
	}
	else if (typeof callback !== 'function') {
		throw new Error('missing callback');
	}
	var chunks = root.split(path.sep); // split in chunks
	var chunk;
	if (path.isAbsolute(root) === true) { // build from absolute path
		chunk = chunks.shift(); // remove "/" or C:/
		if (!chunk) { // add "/"
			chunk = path.sep;
		}
	}
	else {
		chunk = path.resolve(); // build with relative path
	}
	return mkdirRecursive(chunk, chunks, mode, callback);
}

var rmdir = function(path, callback) {
  fs.readdir(path, function(err, files) {
    if (err) {
      // Pass the error on to callback
      callback(err, []);
      return;
    }
    var wait = files.length,
      count = 0,
      folderDone = function(err) {
        count++;
        // If we cleaned out all the files, continue
        if (count >= wait || err) {
          fs.rmdir(path, callback);
        }
      };
    // Empty directory to bail early
    if (!wait) {
      folderDone();
      return;
    }

    // Remove one or more trailing slash to keep from doubling up
    path = path.replace(/\/+$/, "");
    files.forEach(function(file) {
      var curPath = path + "/" + file;
      fs.lstat(curPath, function(err, stats) {
        if (err) {
          callback(err, []);
          return;
        }
        if (stats.isDirectory()) {
          rmdir(curPath, folderDone);
        } else {
          fs.unlink(curPath, folderDone);
        }
      });
    });
  });
};

var copyFiles = function (base, dest, cp, i, cb) {
	if (!cp[i]) return cb();
	var outdir = dest + path.dirname(cp[i]).substr(base.length, cp[i].length);
	mkdir(outdir, function () {
		var out = dest + path.dirname(cp[i]).substr(base.length, cp[i].length) + '/' + path.basename(cp[i]);
		fs.copyFile(cp[i], out, function () {
			copyFiles(base,dest,cp,i+1,cb);	
		});
	});
};

function Copy(dest, dir, cb) {
	walk(dir, function (e, r) {
		var list = [];
		for (var i = 0; i < r.length; i++) {
			if (r[i].indexOf('.scss') > -1) list.push(r[i]);
			if (r[i].indexOf('.png') > -1) list.push(r[i]);
			if (r[i].indexOf('.gif') > -1) list.push(r[i]);
			if (r[i].indexOf('.jpg') > -1) list.push(r[i]);
			if (r[i].indexOf('.ttf') > -1) list.push(r[i]);
			if (r[i].indexOf('.woff') > -1) list.push(r[i]);
			if (r[i].indexOf('.woff2') > -1) list.push(r[i]);
		};
		copyFiles(dir, dest, list, 0, cb);
	});
};

function _Copy(dest, dir, cb) {
	walk(dir, function (e, r) {
		var list = [];
		for (var i = 0; i < r.length; i++) list.push(r[i]);
		copyFiles(dir, dest, list, 0, cb);
	});
};

function npm(l,i,cb) {
	if (!l[i]) return cb();
	console.log('	- Downloading '+l[i]);
	var spawn = require('child_process').spawn;
	var cmd = spawn('npm', ['install', l[i]]);
	cmd.on('exit', (code) => {
  		npm(l,i+1,cb);
	});	
};
function build_all(l,i,cb) {
	if (!l[i]) return cb();
	if (l[i].indexOf('cordova-')==-1) return build_all(l,i+1,cb);
	console.log('	- Building '+l[i]);
	process.chdir(__dirname+'/bin/node_modules/'+l[i]);
	var spawn = require('child_process').spawn;
	var cmd = spawn('npm', ['install']);
	cmd.on('exit', (code) => {
  		npm(l,i+1,cb);
	});	
};
function build_ionicons(cb) {
	console.log('	- Building ionicons');
	process.chdir(__dirname+'/bin/node_modules/ionicons');
	var spawn = require('child_process').spawn;
	var cmd = spawn('npm', ['install']);
	cmd.on('exit', cb);	
};

function copy_fonts(cb) {
	console.log('	- Processing fonts');
	Copy(__dirname +'/dist/ionic/fonts', __dirname + '/bin/node_modules/ionic-angular/fonts',cb);
};
function copy_components(cb) {
	console.log('	- Processing components');
	Copy(__dirname +'/dist/ionic/components', __dirname + '/bin/node_modules/ionic-angular/components',cb);
};
function copy_platform(cb) {
	console.log('	- Processing platform');
	Copy(__dirname +'/dist/ionic/platform', __dirname + '/bin/node_modules/ionic-angular/platform',cb);
};
function copy_themes(cb) {
	console.log('	- Processing themes');
	Copy(__dirname +'/dist/ionic/themes', __dirname + '/bin/node_modules/ionic-angular/themes',cb);
};
function copy_ionicons(cb) {
	console.log('	- Building ionicons');
	build_ionicons(function() {
		console.log('	- Processing ionicons (1/2)');
		Copy(__dirname +'/dist/ionic/fonts', __dirname + '/bin/node_modules/ionicons/dist/fonts',cb);	
	});
};
function copy_ionicons_2(cb) {
	console.log('	- Processing ionicons (2/2)');
	Copy(__dirname +'/dist/ionic/fonts', __dirname + '/bin/node_modules/ionicons/dist/scss',cb);
};

function start_ionic() {
	console.log('- Installing ionic scss dependencies');
	copy_fonts(function() {
		copy_components(function() {
			copy_platform(function() {
				copy_themes(function() {
					copy_ionicons(function() {
						copy_ionicons_2(function() {
							console.log('- Cleaning temp files...');
							rmdir(__dirname+'/bin',function() {
								console.log('all done.');
							});
						})	
					})
				})
			})
		})
	});		
}

function start_cordova() {
	console.log('- Installing cordova packages');
	process.chdir('./bin');
	npm(packages,0,function() {
		build_all(builder,0,function() {
			var spawn = require('child_process').spawn;
			process.chdir(__dirname+'/bin/node_modules/cordova-js');
			var cmd = spawn('grunt', []);
			cmd.on('exit', (code) => {
				mkdir(__dirname+'/dist/cordova',function() {
					_Copy(__dirname+'/dist/cordova',__dirname+'/bin/node_modules/cordova-js/pkg',start_ionic);		
				});
			});	
		});
	});
}

console.log('- Installing (or updating) grunt-cli');

rmdir('./dist', function () {
	rmdir('./bin',function() {
		mkdir("./bin",function() {
			mkdir("./dist",function() {
				mkdir("./bin/node_modules",function() {
					var spawn = require('child_process').spawn;
					var cmd = spawn('npm', ['install', '-g', 'grunt-cli']);
					cmd.on('exit', start_cordova);
				});				
			});
		});
	});
});
