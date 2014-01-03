var twttr, reloadImages;
reloadImages = function() {
  var styles, style, url, _i, _len, _el;
  styles = Array.prototype.slice.call(document.body.querySelectorAll('[style]'));
  for (_i = 0, _len = styles.length; _i < _len; _i++) {
    _el = styles[_i]
    style = _el.getAttribute('style');
    if (!(style.indexOf('url(') > -1)) {
      continue;
    }
    url = style.match(/url\((.*)\)/)[1];
    _el.style.backgroundImage = 'url(' + url + ')';
  }
}

$(document).on('page:fetch', function() {
  NProgress.start();
  // fixes gauges scroll
  window.onscroll = void 0;
  // fixes twitter button
  // $('script#twitter-wjs').remove();
});

$(document).on('page:change', function() {
  NProgress.done();
  // fixes dynamic images (headers)
  reloadImages();
  // fixes twttr
  if (twttr) {
    twttr.widgets.load();
  }
});

$(document).on('page:restore', function() {
  NProgress.remove();
});

NProgress.configure({ showSpinner: false });

$(function() {
  $("[data-repo]").github();
});
