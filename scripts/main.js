"use strict"

// var getCardPoints

// Checks the cards title text and returns scrum points
var getCardScrum = function(el) {
    var title        = $(el).find('.list-card-title').text(),
        regExpScrum  = /\(\d*\.?\d*\)/,
        matchesScrum = regExpScrum.exec(title),
        scrum        = 0;

    // Remove parentheses
    if (matchesScrum != null) scrum = matchesScrum[0].replace(/\(|\)/g,'');

    return scrum;

};

// Checks the cards title text and returns consumed points
var getCardConsumed = function(el) {
     var title           = $(el).find('.list-card-title').text(),
         regExpConsumed  = /\[\d*\.?\d*\]/,
         matchesConsumed = regExpConsumed.exec(title),
         consumed        = 0;

    // Remove brackets
    if (matchesConsumed != null) consumed = matchesConsumed[0].replace(/\[|\]/g,'');

    return consumed;
};

// debouncing function from John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
(function ($, sr) {
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

// Create cards object for the 'Sort by list' view
var createCards = function () {
    var cards;
    $('#content').bind('DOMNodeInserted', function () {
        
        $('#content').unbind('DOMNodeInserted');

        var cards = [],
            lists = [],
            cardElements = $('.list-card-container'),
            isGroupByList = 0,
            uniquelists = [];

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
        
        // Find unique list names
        $.each(lists, function (i, el) {
            if ($.inArray(el, uniquelists) === -1) uniquelists.push(el);
        });

        // Sort list names alphabetically
        uniquelists.sort();

        // Pop over list
        $('.pop-over').bind('DOMNodeInserted', function () {
            
            // Return if 'Sort by list' item exists
            if ($('.pop-over').find('.js-sort-by-list').length) return;
            
            // Append 'Sort by list' item
            $('<li><a class="highlight-icon js-sort-by-list" href="#">Sort by list <span class="icon-sm icon-check"></span></a></li>').appendTo('.pop-over-list');

            // If grouping by list, then add add check icon to 'Sort by list' item
            if (isGroupByList) {
                $('.pop-over-list li').removeClass('active');
                $('.js-sort-by-list').parent().addClass('active');
            }
            
            // Pop over list items
            $('.pop-over-list li > a').click( function() {

                // Return if this is not the 'Sort by list' item
                if (!$(this).hasClass('js-sort-by-list')) {
                    isGroupByList = 0
                    $('#filter-list-menu').remove();
                    $('#trellisto-pop-over-filter').remove();
                    return;
                }
                
                // Remember that 'Sort by list' is selected
                isGroupByList = 1;

                // Update 'Sort by []' label
                $('.js-sort-text').children('strong:first-child').text('list');

                // Hide the popover list
                $('.pop-over').removeClass('is-shown');

                // Clear the popover list
                $('.pop-over').find('.pop-over-content').html('');

                // Clear the sort results
                $('.js-cards-content').html('');
                
                var filterListButton = '',
                filterList       = '';
                 
                filterListButton += '<a id="filter-list-menu" class="quiet-button mod-with-image" href="#">';
                filterListButton +=     '<span class="icon-sm icon-dropdown-menu quiet-button-icon"></span>';
                filterListButton +=     '<span class="">Filter</span>';
                filterListButton += '</a>';

                filterList       += '<div id="trellisto-pop-over-filter" class="trellisto-pop-over">';
                filterList       +=    '<div class="pop-over-header <js-pop-over-head></js-pop-over-head>er">';
                filterList       +=        '<a class="pop-over-header-back-btn icon-sm icon-back js-back-view" href="#"></a>';
                filterList       +=        '<span class="pop-over-header-title js-fill-pop-over-title">Filter Cards</span>';    
                filterList       +=        '<a class="pop-over-header-close-btn icon-sm icon-close js-close-popover" href="#"></a>';
                filterList       +=    '</div>';
                filterList       +=    '<div class="trellisto-pop-over-content">';
                filterList       +=        '<div>';
                filterList       +=            '<ul class="trellisto-pop-over-list checkable">';
                filterList       +=                '<label for="filter-all"><input type="checkbox" class="list-filter" id="filter-all" checked>All</label>';
                filterList       +=            '</ul>';
                filterList       +=        '</div>';
                filterList       +=    '</div>';
                filterList       += '</div>';

                
                if (!$('.u-gutter').find('#filter-list-menu').length) {
                    $(filterListButton).appendTo('.js-content > .window-module');
                    $(filterList).appendTo('.js-content > .window-module');

                    $('#filter-list-menu').click(function () {
                        $('#trellisto-pop-over-filter').toggleClass('trellisto-shown');
                    });
                }

                var trellistoList = '#trellisto-pop-over-filter .trellisto-pop-over-list';

                $('#trellisto-pop-over-filter .trellisto-pop-over-list').html('');
                $('<label for="filter-all"><input type="checkbox" class="list-filter" id="filter-all" checked>All</label>').appendTo(trellistoList);

                // For each unique list name, create a group of cards
                $.each(uniquelists, function (i, el) {

                    var scrumTotal    = 0,
                        consumedTotal = 0,
                        className     = el;//.replace(/\s+/g, '').toLowerCase();

                    var module = '<div class="window-module"><div class="window-module-title"><span class="window-module-title-icon icon-lg icon-list"></span><h3>'+el+'</h3></div>';
                    
                    module += '<div class="u-gutter float-cards u-clearfix js-list">';

                    // Find all cards for this list
                    var filtered = cards.filter(function(obj) {
                        return obj.list == el;
                    });

                    // Construct a card for each object
                    $.each(filtered, function (i, obj) {
                        module += '<div class="list-card-container">';
                        module +=   '<div class="js-card">'+obj.jsCard+'</div>';
                        module +=   '<p class="list-card-position quiet"> in <strong>'+obj.list+'</strong> on <strong>'+obj.board+'</strong></p>';
                        module += '</div>';
                    });

                    module += '</div></div>';

                    // Append the group
                    $(module).appendTo('.js-cards-content');

                    // Add to filter list
                    $('<label for="filter-'+className+'"><input type="checkbox" class="list-filter" id="filter-'+className+'">'+el+'</label>').appendTo(trellistoList);

                });
                
                $(trellistoList).on('change', '.list-filter', function (e) {
                    e.preventDefault();
                    var currentId = this.id.replace('filter-', '');
                    if (currentId == 'all') {
                        $('.list-card-container').fadeIn();
                        $('.list-filter').not($(this)).attr('checked', false);
                        $(this).parent().siblings('.trellisto-is-checked').removeClass('trellisto-is-checked');
                        $(this).parent().addClass('trellisto-is-checked');
                    }
                    else {
                        $('#filter-all').attr('checked', false);
                        $('#filter-all').parent().removeClass('trellisto-is-checked');
                        
                        $('.list-filter:checked').each(function() {
                            $(this).parent().addClass('trellisto-is-checked');
                            currentId = this.id.replace('filter-', '');
                            cards = $('.list-card-container').find('.list-card-position:contains("' + currentId + '")').parents('.list-card-container').filter(':hidden');
                            $(cards).fadeIn();
                        });
                        $('.list-filter').not(':checked').each(function() {
                            $(this).parent().removeClass('trellisto-is-checked');
                            currentId = this.id.replace('filter-', '');
                            cards = $('.list-card-container').find('.list-card-position:contains("' + currentId + '")').parents('.list-card-container');
                            $(cards).fadeOut();
                        });
                        
                    }
                });

                /*

                $('.window-module.u-gutter').on('change', '.list-filter', function (e) {

                    
                    e.preventDefault();
                    var currentId = this.id.replace('filter-', '');
                    if (currentId == 'all') {
                        $('.list-card-container').fadeIn();
                        $('.list-filter').not($(this)).attr('checked', false);
                        $(this).parent().siblings('.danger').removeClass('danger');
                        $(this).parent().addClass('danger');
                    }
                    else {
                        $('#filter-all').attr('checked', false);
                        $('#filter-all').parent().removeClass('danger');
                        $('.list-filter:checked').each(function() {
                            $(this).parent().addClass('danger');
                            currentId = this.id.replace('filter-', '');
                            cards = $('.list-card-container').find('.list-card-position:contains("' + currentId + '")').parents('.list-card-container').filter(':hidden');
                            $(cards).fadeIn();
                        });
                        $('.list-filter').not(':checked').each(function() {
                            $(this).parent().removeClass('danger');
                            currentId = this.id.replace('filter-', '');
                            cards = $('.list-card-container').find('.list-card-position:contains("' + currentId + '")').parents('.list-card-container');
                            $(cards).fadeOut();
                        });
                    }
                    
                });

                */

            });
        });
        
        // Cards have been inserted
        $('.js-content').debouncedDNI(function () {

            // Return if scrum values have been added
            if ($('.js-content').find('[class="groupbylist-scrum-total"]').length) return;

            var group = $('.js-cards-content .window-module');

            // Calculate and add total scrum/consumed points to each card group
            $.each(group, function (i, grp) {
                var scrumTotal        = 0,
                    consumedTotal     = 0,
                    cards             = $(grp).find('.list-card-container'),
                    groupTitle        = $(grp).find('.window-module-title');

                    $.each(cards, function (i, card) {
                        scrumTotal    += parseFloat(getCardScrum(card));
                        consumedTotal += parseFloat(getCardConsumed(card));
                    });
                    
                    $('<span class="groupbylist-consumed-total">'+consumedTotal+'</span><span class="groupbylist-scrum-total">'+scrumTotal+'</span>').appendTo(groupTitle);
                    
            });                
                
        });  

    }); // #content .bing

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