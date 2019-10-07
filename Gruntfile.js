'use strict';

module.exports = function(grunt){  
  require('time-grunt')(grunt);

  let pkg = grunt.file.readJSON('package.json');
  let license = grunt.file.read('build/license-header.txt');
  let verParts = pkg.version.split('.');
  let version = {
    full: pkg.version,
    major: verParts[0],
    minor: verParts[1],
    patch: verParts[2]
  };

  version.majorMinor = `${version.major}.${version.minor}`;
  grunt.dwjsVersion = version;

  // Project configuration.
  grunt.initConfig({
    pkg,
    clean: {
      build: ['build/temp/*'],
      dist: ['dist/*']
    },
    jshint: {
      src: {
        src: ['src/js/**/*.js'],
        options: {
          jshintrc: '.jshintrc'
        }
      }
    },
    uglify: {
      options: {
        sourceMap: true,
        sourceMapIn: 'build/temp/datawriterclient.js.map',
        sourceMapRoot: '../../src/js',
        preserveComments: 'some',
        mangle: true,
        compress: {
          sequences: true,
          dead_code: true,
          conditionals: true,
          booleans: true,
          unused: false,
          if_return: true,
          join_vars: true,
          drop_console: false
        }
      },
      build: {
        files: {
          'build/temp/datawriterclient.min.js': 'build/temp/datawriterclient.js'
        }
      }
    },
    dist: {},
    watch: {
      default: {
        files: [ 'src/**/*', 'Gruntfile.js' ],
        tasks: 'dev'
      },
      skin: {
        files: ['src/css/**/*'],
        tasks: 'dev'
      }
    },
    connect: {
      preview: {
        options: {
          port: 9999,
          keepalive: true
        }
      },
      dev: {
        options: {
          port: 9999,
          livereload: true
        }
      }
    },
    copy: {
      minor: {
        files: [
          {expand: true, cwd: 'build/temp/', src: ['*'], dest: 'dist/'+version.majorMinor+'/', filter: 'isFile'} // includes files in path
        ]
      },
      patch: {
        files: [
          {expand: true, cwd: 'build/temp/', src: ['*'], dest: 'dist/'+version.full+'/', filter: 'isFile'} // includes files in path
        ]
      },
      css: { expand: true, cwd: 'src/css/', src: ['*'], dest: 'build/temp/', filter: 'isFile' },
      dist: { expand: true, cwd: 'build/temp/', src: ['**/**'], dest: 'dist/', filter: 'isFile' },
      examples: { expand: true, cwd: 'examples/', src: ['**/**'], dest: 'dist/examples/', filter: 'isFile' }
    },
    cssmin: {
      minify: {
        expand: true,
        cwd: 'src/css/',
        src: ['datawriterclient.css'],
        dest: 'build/temp/',
        ext: '.min.css'
      }
    },
    jsdoc: {
      dist : {
        src: ['src/js/*.js', 'README.md'],
        options: {
          destination: 'doc'
        }
      }
    },
    zip: {
      dist: {
        router: function (filepath) {
          var path = require('path');
          return path.relative('dist', filepath);
        },
        // compression: 'DEFLATE',
        src: ['dist/**/*'],
        dest: 'dist/datawriterclient-js-' + version.full + '.zip'
      }
    },
    version: {
      options: {
        pkg: 'package.json'
      },
      major: {
        options: {
          release: 'major'
        },
        src: ['package.json', 'component.json']
      },
      minor: {
        options: {
          release: 'minor'
        },
        src: ['package.json', 'component.json']
      },
      patch: {
        options: {
          release: 'patch'
        },
        src: ['package.json', 'component.json']
      },
      prerelease: {
        options: {
          release: 'prerelease'
        },
        src: ['package.json', 'component.json']
      },
      css: {
        options: {
          prefix: '@version\\s*'
        },
        src: 'build/temp/datawriterclient.css'
      }
    },
    browserify: {
	  options: {
	    browserifyOptions: {
		  debug: true,
		  standalone: 'dwjs'
	    },
		banner: license,
		  plugin: [
			[ 'browserify-derequire' ]
		  ],
		  transform: [
			require('babelify').configure({
			  sourceMapRelative: './',
              presets: ['es2015']
			}),
			['browserify-versionify', {
			  placeholder: '__VERSION__',
			  version: pkg.version
			}],
			['browserify-versionify', {
			  placeholder: '__VERSION_NO_PATCH__',
			  version: version.majorMinor
			}]
		  ]
	  },
      build: {
        files: {
          'build/temp/datawriterclient.js': ['./src/js/dw.js']
        },
      },
      watch: {
        files: {
          'build/temp/datawriterclient.js': ['src/js/datawriterclient.js']
        },
        options: {
          watch: true,
          keepAlive: true,
          browserifyOptions: {
            standalone: 'dwjs'
          },
          banner: license,
          transform: ['babelify', {'presets': ['es2015']}],
          plugin: [
            [ 'browserify-derequire' ]
          ]
        }
      }
    },
    exorcise: {
      build: {
        options: {},
        files: {
          'build/temp/datawriterclient.js.map': ['build/temp/datawriterclient.js'],
        }
      }
    },
  });

  // load all the npm grunt tasks
  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('chg');

 grunt.registerTask('build', [
    'clean:build',
    'clean:dist',
    'jshint',
    'cssmin',
    'browserify:build',
    'exorcise:build',
    'uglify',
    'copy:css',
    'copy:dist',
    'clean:build',
    'version:css'
  ]);

  grunt.registerTask('dist', [
    'clean:dist',
    'build:dist',
    'copy:dist',
    'copy:examples',
    'jsdoc:dist',
    'zip:dist'
  ]);

  // Default task - build and test
  grunt.registerTask('default', ['build']);
  
  grunt.registerTask('test', ['jshint']);
  
  grunt.registerTask('dev', ['build', 'connect:dev', 'watch', 'browserify:watch']);
};