"use strict";function _toConsumableArray(r){return _arrayWithoutHoles(r)||_iterableToArray(r)||_unsupportedIterableToArray(r)||_nonIterableSpread()}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function _iterableToArray(r){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(r))return Array.from(r)}function _arrayWithoutHoles(r){if(Array.isArray(r))return _arrayLikeToArray(r)}function _createForOfIteratorHelper(r,t){var e;if("undefined"==typeof Symbol||null==r[Symbol.iterator]){if(Array.isArray(r)||(e=_unsupportedIterableToArray(r))||t&&r&&"number"==typeof r.length){e&&(r=e);var n=0,o=function(){};return{s:o,n:function(){return n>=r.length?{done:!0}:{done:!1,value:r[n++]}},e:function(r){throw r},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,i=!0,l=!1;return{s:function(){e=r[Symbol.iterator]()},n:function(){var r=e.next();return i=r.done,r},e:function(r){l=!0,a=r},f:function(){try{i||null==e.return||e.return()}finally{if(l)throw a}}}}function _unsupportedIterableToArray(r,t){if(r){if("string"==typeof r)return _arrayLikeToArray(r,t);var e=Object.prototype.toString.call(r).slice(8,-1);return"Object"===e&&r.constructor&&(e=r.constructor.name),"Map"===e||"Set"===e?Array.from(r):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?_arrayLikeToArray(r,t):void 0}}function _arrayLikeToArray(r,t){(null==t||t>r.length)&&(t=r.length);for(var e=0,n=new Array(t);e<t;e++)n[e]=r[e];return n}!function(p,h){void 0!==p.IntersectionObserver&&h.querySelectorAll("#toc").forEach(function(r){for(var l=new Set,s=new Map,u=Array.from(r.querySelectorAll(".menu-list > li > a")),t=0,e=u;t<e.length;t++){var n=e[t],o=n.getAttribute("href").trim().slice(1),a=h.getElementById(o);a&&s.set(a,n)}for(var f=Array.from(s.keys()),i=new IntersectionObserver(function(r){var t,e,n=_createForOfIteratorHelper(r);try{for(n.s();!(t=n.n()).done;){var o=t.value;o.isIntersecting?l.add(o.target):l.delete(o.target)}}catch(r){n.e(r)}finally{n.f()}if(l.size?e=_toConsumableArray(l).sort(function(r,t){return r.offsetTop-t.offsetTop})[0]:f.length&&(e=f.filter(function(r){return r.offsetTop<p.scrollY}).sort(function(r,t){return t.offsetTop-r.offsetTop})[0]),e&&s.has(e)){u.forEach(function(r){return r.classList.remove("is-active")});var a=s.get(e);a.classList.add("is-active");for(var i=a.parentElement.parentElement;i.classList.contains("menu-list")&&"li"===i.parentElement.tagName.toLowerCase();)i.parentElement.children[0].classList.add("is-active"),i=i.parentElement.parentElement}},{threshold:0}),c=function(){var t=d[y];if(i.observe(t),s.has(t)){var e=s.get(t);e.setAttribute("data-href",e.getAttribute("href")),e.setAttribute("href","javascript:;"),e.addEventListener("click",function(){"function"==typeof t.scrollIntoView&&t.scrollIntoView({behavior:"smooth"});var r=e.getAttribute("data-href");history.pushState?history.pushState(null,null,r):location.hash=r}),t.style.scrollMargin="1em"}},y=0,d=f;y<d.length;y++)c()})}(window,document);