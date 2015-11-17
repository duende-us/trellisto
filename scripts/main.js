"use strict"

var getCardScrum = function(el) {
    var title        = $(el).find('.list-card-title').text(),
        regExpScrum  = /\(([0-9]+)\)/,
        matchesScrum = regExpScrum.exec(title),
        scrum        = 0;

    // Remove parentheses from any scrum values
    if (matchesScrum != null) scrum = matchesScrum[0].replace(/\(|\)/g,'');

    return scrum;

};

var getCardConsumed = function(el) {
     var title           = $(el).find('.list-card-title').text(),
         regExpConsumed  = /\[([0-9]+)\]/,
         matchesConsumed = regExpConsumed.exec(title),
         consumed        = 0;

    // Remove brackets from any consumed values
    if (matchesConsumed != null) consumed = matchesConsumed[0].replace(/\[|\]/g,'');

    return consumed;
};

var createCards = function () {
    var cards;
    $('#content').bind('DOMNodeInserted', function () {
        
        $('#content').unbind('DOMNodeInserted');

        var cards = [],
            lists = [],
            cardElements = $('.list-card-container'),
            isGroupByList = 0;

        $.each(cardElements, function (i, el) {
            var jsCard   = $(el).find('.js-card').html(),
                scrum    = getCardScrum(el),
                consumed = getCardConsumed(el),
                list     = $(el).find('.list-card-position').children('strong:first-child').text(),
                board    = $(el).parents('.window-module').find('.window-module-title h3 a').text();

            lists.push(list);
            
            cards.push({ jsCard   : jsCard,
                         scrum    : scrum,
                         consumed : consumed,
                         list     : list,
                         board    : board });
        });

        var uniquelists = [];
        $.each(lists, function (i, el) {
            if ($.inArray(el, uniquelists) === -1) uniquelists.push(el);
        });

        // Sort list names alphabetically
        uniquelists.sort(); 

        $('.pop-over').bind('DOMNodeInserted', function () {
            
            if ($('.pop-over').find('.js-sort-by-list').length) return;
            
            $('<li><a class="highlight-icon js-sort-by-list" href="#">Sort by list <span class="icon-sm icon-check"></span></a></li>').appendTo('.pop-over-list');

            if (isGroupByList) {
                // Remove check icon from all pop-over list items
                $('.pop-over-list li').removeClass('active');

                // Add check icon to Sort by List
                $('.js-sort-by-list').parent().addClass('active');
            }
            
            $('.pop-over-list li > a').click( function() {
                isGroupByList = 0
            });

            $('.js-sort-by-list').click( function() {
                
                isGroupByList = 1;

                $('.js-sort-text').children('strong:first-child').text('list');

                // Clear the popover list
                $('.pop-over').find('.pop-over-content').html('');

                $('.pop-over').removeClass('is-shown');

                $('.js-cards-content').html('');
               
                $.each(uniquelists, function (i, el) {

                    var scrumTotal        = 0,
                        scrumClassName    = 'groupbylist-scrum-total-'+i,
                        consumedTotal     = 0,
                        consumedClassName = 'groupbylist-consumed-total-'+i;
 
                    var filtered = cards.filter(function(obj) {
                        return obj.list == el;
                    });

                    var module = '<div class="window-module"><div class="window-module-title"><span class="window-module-title-icon icon-lg icon-list"></span><h3>'+el+'</h3><span class="'+consumedClassName+'"></span><span class="'+scrumClassName+'"></span></div>'
                    
                    module += '<div class="u-gutter float-cards u-clearfix js-list">';

                    $.each(filtered, function (i, obj) {
                        module += '<div class="list-card-container">';
                        module +=   '<div class="js-card">'+obj.jsCard+'</div>';
                        module +=   '<p class="list-card-position quiet"> in <strong>'+obj.list+'</strong> on <strong>'+obj.board+'</strong></p>';
                        module += '</div>';

                        scrumTotal    += parseInt(obj.scrum);
                        consumedTotal += parseInt(obj.consumed);
                    });

                    module += '</div>';
                    module += '</div>';

                    $(module).appendTo('.js-cards-content');

                    scrumClassName = '.' + scrumClassName;
                    $(scrumClassName).text(scrumTotal);
                    consumedClassName = '.' + consumedClassName;
                    $(consumedClassName).text(consumedTotal);
                });

            });
        });

        (function ($, sr) {
        // debouncing function from John Hann
        // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
        var debounce = function (func, threshold, execAsap) {
            var timeout;
            return function debounced() {
                var obj = this, args = arguments;
                function delayed() {
                    if (!execAsap)
                        func.apply(obj, args);
                    timeout = null;
                };
                if (timeout) {clearTimeout(timeout);
                } else if (execAsap) {func.apply(obj, args);}
                timeout = setTimeout(delayed, threshold || 100);
            };
        }
        jQuery.fn[sr] = function (fn) { return fn ? this.on('DOMNodeInserted', debounce(fn)) : this.trigger(sr); };
        })(jQuery, 'debouncedDNI');


        $('.js-content').debouncedDNI(function () {

            if ($('.js-content').find('[class*="groupbylist-scrum-total-"]').length)  return;

            var group = $('.js-cards-content .window-module');

            $.each(group, function (i, grp) {
                var scrumTotal        = 0,
                    scrumClassName    = 'groupbylist-scrum-total-'+i,
                    consumedTotal     = 0,
                    consumedClassName = 'groupbylist-consumed-total-'+i,
                    cards             = $(grp).find('.list-card-container'),
                    groupTitle        = $(grp).find('.window-module-title');

                    $.each(cards, function (i, card) {
                        scrumTotal    += parseInt(getCardScrum(card));
                        consumedTotal += parseInt(getCardConsumed(card));
                    });

                    
                    $('<span class="'+consumedClassName+'">'+consumedTotal+'</span><span class="'+scrumClassName+'">'+scrumTotal+'</span>').appendTo(groupTitle);
                    
            });                
                
        });  

    });

};

var ran = 0;
var href = window.location.href;
if (href.substr(href.lastIndexOf('/') + 1) == 'cards') {
    createCards();

    ran = 1;
}
setInterval(function () {
    var href = window.location.href;
    if (href.substr(href.lastIndexOf('/') + 1) == 'cards') {
        if (ran === 0) {
            ran = 1;
            createCards();
        }
    } else {
        ran = 0;
    }
}, 500);