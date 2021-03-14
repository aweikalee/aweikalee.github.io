const { dest, series, src } = require('gulp')
const htmlmin = require('gulp-htmlmin')
const minifycss = require('gulp-minify-css')
const uglify = require('gulp-uglify')
const babel = require('gulp-babel')

const DIST = 'public'

function minifyHTML() {
    return src('public/**/*.html')
        .pipe(htmlmin({
            collapseWhitespace: true,
            removeComments: true,
            minifyJS: true,
        }))
        .pipe(dest(DIST))
}

function minifyCSS() {
    return src('public/**/*.css')
        .pipe(minifycss())
        .pipe(dest(DIST))
}

function minifyJS() {
    return src('public/**/*.js', {
        ignore: '**/*min.js'
    })
        .pipe(babel({
        presets: ['@babel/preset-env']
        }))
        .pipe(uglify())
        .pipe(dest(DIST))
}

exports.default = series(minifyHTML, minifyCSS, minifyJS)