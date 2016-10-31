var gulp = require('gulp');
var gulpLoadPlugins = require('gulp-load-plugins');
var browserSync = require('browser-sync');
var del = require('del');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var buffer = require('vinyl-buffer');

var $ = gulpLoadPlugins();
var reload = browserSync.reload;

var fontName = 'Icons';

gulp.task('iconfont', function() {
    gulp.src(['app/images/icons/svg/*.svg'], {base: 'frontend-dev'})
        .pipe($.iconfontCss({
            fontName: fontName,
            prependUnicode: true,
            targetPath: '_icons.scss',
            fontPath: '/fonts/'
        }))
        .pipe($.iconfont({
            fontName: fontName
        }))
        .pipe(gulp.dest('app/fonts'));
});

gulp.task('sprite', function () {
    var spriteData = gulp.src('app/images/icons/*.png').pipe($.spritesmith({
        imgName: 'sprite.png',
        cssName: '_sprite.scss',
        imgPath: '/images/sprite.png'
    }));

    var imgStream = spriteData.img
        .pipe(buffer())
        .pipe($.imagemin())
        .pipe(gulp.dest('app/images/'));

    var cssStream = spriteData.css
        .pipe(gulp.dest('app/styles/template/utilities/icons'));
    return merge(imgStream, cssStream);
});

gulp.task('styles', function () {
    return gulp.src('app/styles/**/*.scss')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass.sync({
            outputStyle: 'expanded',
            precision: 10,
            includePaths: ['.']
        }).on('error', $.sass.logError))
        .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('.tmp/styles'))
        .pipe(reload({stream: true}));
});

// you can work with scss on the dist file
gulp.task('styles:dist', function () {
    return gulp.src('app/styles/**/*.scss')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass.sync({
            outputStyle: 'expanded',
            precision: 10,
            includePaths: ['.']
        }).on('error', $.sass.logError))
        .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('dist/styles'))
        .pipe(reload({stream: true}));
});


//you can require your files with browserify
gulp.task('browserify', function() {
    gulp.src('app/scripts/**/**.js')
        .pipe($.browserify({
            insertGlobals : true,
            debug : !gulp.env.production
        }))
        .pipe($.uglify())
        .pipe(gulp.dest('dist/scripts'))
});

//you can also use useref
gulp.task('scripts', function () {
    return gulp.src('app/scripts/**/*.js')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('.tmp/scripts'))
        .pipe(reload({stream: true}));
});

gulp.task('html', ['styles', 'browserify'], function () {
    return gulp.src('app/*.html')
        .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.cssnano({safe: true, autoprefixer: false})))
        .pipe(gulp.dest('public'));
});

gulp.task('html:dist', ['styles:dist', 'browserify'], function () {
    return gulp.src('app/*.html')
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.cssnano({safe: true, autoprefixer: false})))
        .pipe(gulp.dest('dist'));
});

gulp.task('images', function () {
    return gulp.src('app/images/**/*')
        .pipe($.cache($.imagemin()))
        .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function () {
    return gulp.src(['app/fonts/**/*.ttf', 'app/fonts/**/*.eot', 'app/fonts/**/*.woff'])
        .pipe(gulp.dest('.tmp/fonts'))
        .pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', function () {
    return gulp.src([
        'app/*',
        '!app/*.html'
    ], {
        dot: true
    }).pipe(gulp.dest('public'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist/']));


//to work on the frontend
gulp.task('serve', function () {
    runSequence(['clean'], ['styles', 'browserify', 'fonts'], function () {
        browserSync({
            notify: false,
            port: 9000,
            server: {
                baseDir: ['.tmp', 'app']
            }
        });
        gulp.watch([
            'app/*.html',
            'app/images/**/*',
            '.tmp/fonts/**/*'
        ]).on('change', reload);
        gulp.watch('app/styles/**/*.scss', ['styles']);
        gulp.watch('app/scripts/**/*.js', ['scripts']);
        gulp.watch('app/fonts/**/*', ['fonts']);
    });
});

//to work on the admin panel
gulp.task('serve:dist', function () {
    runSequence(['html:dist', 'images', 'fonts'], function () {
        browserSync({
            notify: false,
            port: 9000,
            server: {
                baseDir: ['dist']
            }
        });
        gulp.watch([
            'app/*.html',
            'app/images/**/*'
        ]).on('change', reload);
        gulp.watch('app/styles/**/*.scss', ['styles:dist']);
        gulp.watch('app/scripts/**/*.js', ['browserify']);
        gulp.watch('app/fonts/**/*', ['fonts']);
    });
});

gulp.task('build', ['html', 'images', 'fonts', 'extras'], function () {
    return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', function () {
    runSequence(['clean'], 'build');
});
