/*---------------------------------------------------------------------------------------------------
    
  Duende Trellisto, v1.0.1

  Authors     : Barrett Cox, http://barrettcox.com
                Amy Wu,      http://duende.us

  Description : Loads data from a Google spreadsheet and displays
                a dashboard UI for experiment iteration

---------------------------------------------------------------------------------------------------*/

"use strict"

;(function ( $ ) {

  $.trellisto = function (params) {

    // Store a reference to this object prototype to
    // use as a reference within the methods
    var thisTrellisto = this;

    this.cardClassName = 'card-grid-container';
    this.cardClass     = '.'+this.cardClassName;

    // Checks the cards title text and returns scrum points
    this.getCardScrum = function(el) {
        var title        = $(el).find('.list-card-title').text(),
            regExpScrum  = /\(\d*\.?\d*\)/,
            matchesScrum = regExpScrum.exec(title),
            scrum        = 0;

        // Remove parentheses
        if (matchesScrum != null) scrum = matchesScrum[0].replace(/\(|\)/g,'');

        return scrum;

    }; // end - getCardScrum

    // Checks the cards title text and returns consumed points
    this.getCardConsumed = function(el) {
         var title           = $(el).find('.list-card-title').text(),
             regExpConsumed  = /\[\d*\.?\d*\]/,
             matchesConsumed = regExpConsumed.exec(title),
             consumed        = 0;

        // Remove brackets
        if (matchesConsumed != null) consumed = matchesConsumed[0].replace(/\[|\]/g,'');

        return consumed;
    }; // end - getCardConsumed

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

    // Makes a group of cards for each unique
    // list name and appends them to the DOM
    this.appendCardGroup = function(trellistoList, uniquelists, cards ) {
      
      $.each(uniquelists, function (i, el) {

        var scrumTotal    = 0,
            consumedTotal = 0;

        var module = '<div class="window-module"><div class="window-module-title"><span class="window-module-title-icon icon-lg icon-list"></span><h3>'+el+'</h3></div>';
        
        module += '<div class="u-gutter float-cards u-clearfix js-list">';

        // Find all cards for this list
        var filtered = cards.filter(function(obj) {
            return obj.list == el;
        });

        // Construct a card for each object
        $.each(filtered, function (i, obj) {
            module += '<div class="'+thisTrellisto.cardClassName+'">';
            module +=   '<div class="js-card">'+obj.jsCard+'</div>';
            module +=   '<p class="list-card-position quiet"><strong class="trellisto-in-list">'+obj.list+'</strong> on <strong>'+obj.board+'</strong></p>';
            module += '</div>';
        });

        module += '</div></div>';

        // Append the group
        $(module).appendTo('.js-cards-content');

      });
    }; // end - appendCardGroup

    this.appendFilterList = function(trellistoList, uniquelists ) {
      $.each(uniquelists, function (i, el) {
        var className = el;//.replace(/\s+/g, '').toLowerCase();
        // Add to filter list
        $('<label for="filter-'+className+'"><input type="checkbox" class="list-filter" id="filter-'+className+'">'+el+'</label>').appendTo(trellistoList);
      });
    }; // end - appendFilterList

    // Create the Filter menu
    this.calculateScrum = function() {

      var group = $('.js-cards-content .window-module');

      $('.groupbylist-consumed-total, .groupbylist-scrum-total').remove();

      // Calculate and add total scrum/consumed points to each card group
      $.each(group, function (i, grp) {
        var scrumTotal  = 0,
          consumedTotal = 0,
          cards         = $(grp).find(thisTrellisto.cardClass),
          groupTitle    = $(grp).find('.window-module-title');

          $.each(cards, function (i, card) {
            if(!$(card).hasClass('trellisto-hidden')) {
              scrumTotal    += parseFloat(thisTrellisto.getCardScrum(card));
              consumedTotal += parseFloat(thisTrellisto.getCardConsumed(card));
            }
          });

          $('<span class="groupbylist-consumed-total">'+consumedTotal+'</span><span class="groupbylist-scrum-total">'+scrumTotal+'</span>').appendTo(groupTitle);
      });  
    }; // end - calculateScrum

    // Create the Filter menu
    this.makeFilterMenu = function(trellistoList, uniquelists, cards) {
      
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
      filterList       +=        '<a class="pop-over-header-close-btn icon-sm icon-close js-trellisto-filter-close" href="#"></a>';
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

        // Show the popover list when Filter is clicked
        $('#filter-list-menu').click(function () {
            $('#trellisto-pop-over-filter').toggleClass('trellisto-shown');
        });

        // Hide the popover list when 'x' is clicked
        $('.js-trellisto-filter-close').click(function () {
            $('#trellisto-pop-over-filter').removeClass('trellisto-shown');
        });
      }

      $(trellistoList).html('');
      $('<label for="filter-all"><input type="checkbox" class="list-filter" id="filter-all" checked>All</label>').appendTo(trellistoList);

      $(trellistoList).on('change', '.list-filter', function (e) {
        e.preventDefault();
        var currentId = this.id.replace('filter-', ''),
            visibleCards;

        if (currentId == 'all') {
          // Show all hidden groups
          $('.window-module').has(thisTrellisto.cardClass).each(function() {
            if ($(this).is(':hidden')) {
              $(this).fadeIn();
            }
          });
          // Show all cards
          $(thisTrellisto.cardClass).fadeIn();
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
            // Find all cards that contain a matching list label
            var cardsInList = $(thisTrellisto.cardClass).find('.list-card-position > strong:first-child').filter(function() {
               return $(this).text() == currentId;
            });

            // Find all card parents that are already trellisto-hidden
            cardsInList = cardsInList.parents(thisTrellisto.cardClass).filter(':hidden');
            $(cardsInList).removeClass('trellisto-hidden');

            $(cardsInList).fadeIn();
          });

          $('.list-filter').not(':checked').each(function() {
            $(this).parent().removeClass('trellisto-is-checked');
            currentId = this.id.replace('filter-', '');
            // Find all cards that contain a matching list label
            var cardsInList = $(thisTrellisto.cardClass).find('.list-card-position > strong:first-child').filter(function() {
                return $(this).text() == currentId;
            });
            
            // Find all cards by class name
            cardsInList = cardsInList.parents(thisTrellisto.cardClass);

            // Add trellisto-hidden class to cards
            $(cardsInList).addClass('trellisto-hidden');

            $(cardsInList).fadeOut();
          });
          
          $('.window-module').has(thisTrellisto.cardClass).each(function() {
            var visibleChildren = $(this).find(thisTrellisto.cardClass+':not(.trellisto-hidden)');
            if (!visibleChildren.length && $(this).not(':hidden')) {
              $(this).fadeOut();
            } else if ($(this).is(':hidden')) {
              $(this).fadeIn();
            }
          });
                    
        }

        thisTrellisto.calculateScrum();

      });
    }; // end - makeFilterMenu

    // Create cards object for the 'Sort by list name' view
    this.createCards = function () {
      var cards;
      $('#content').bind('DOMNodeInserted', function () {
          
        $('#content').unbind('DOMNodeInserted');

        var cards = [],
            lists = [],
            cardElements = $(thisTrellisto.cardClass),
            isGroupByList = 0,
            uniquelists = [],
            trellistoList = '#trellisto-pop-over-filter .trellisto-pop-over-list';

        $.each(cardElements, function (i, el) {
            
          var jsCard   = $(el).find('.js-card').html(),
              scrum    = thisTrellisto.getCardScrum(el),
              consumed = thisTrellisto.getCardConsumed(el),
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

        // Add the Filter menu to the DOM
        thisTrellisto.makeFilterMenu(trellistoList, uniquelists, cards);

        // Add items to the filter list
        thisTrellisto.appendFilterList(trellistoList, uniquelists);

        // Calculate the scrum
        thisTrellisto.calculateScrum();

        // Pop over list
        $('.pop-over').bind('DOMNodeInserted', function () {
            
          // Return if 'Sort by list name' item exists
          if ($('.pop-over').find('.js-sort-by-list').length) return;
          
          // Append 'Sort by list name' item
          $('<li><a class="highlight-icon js-sort-by-list" href="#">Sort by list name <span class="icon-sm icon-check"></span></a></li>').appendTo('.pop-over-list');

          // If grouping by list, then add add check icon to 'Sort by list name' item
          if (isGroupByList) {
            $('.pop-over-list li').removeClass('active');
            $('.js-sort-by-list').parent().addClass('active');
          }
          
          // Pop over list items
          $('.pop-over-list li > a').click( function() {

            isGroupByList = $(this).hasClass('js-sort-by-list') ? 1 : 0;

            // If Sort by list name
            if ($(this).hasClass('js-sort-by-list')) {
              // Update 'Sort by []' label
              $('.js-sort-text').children('strong:first-child').text('list name');
              // Hide the popover list
              $('.pop-over').removeClass('is-shown');
              // Clear the popover list
              $('.pop-over').find('.pop-over-content').html('');
              // Clear the sort results
              $('.js-cards-content').html('');
            }
            
            // Add the Filter menu to the DOM
            thisTrellisto.makeFilterMenu(trellistoList, uniquelists, cards);

            // If Group By List, then append list card group to the DOM
            if (isGroupByList) {
              thisTrellisto.appendCardGroup(trellistoList, uniquelists, cards);
            }
            
            // Add items to the filter list
            thisTrellisto.appendFilterList(trellistoList, uniquelists);

          });
        });
        
        // Cards have been inserted
        $('.js-content').debouncedDNI(function () {

          // Return if scrum values have been added
          if ($('.js-content').find('[class="groupbylist-scrum-total"]').length) return;

          thisTrellisto.calculateScrum(); // Calculate the scrum
                
        });  
      }); // #content .bind
    }; // end - createCards

    var ran = 0;
    var href = window.location.href;
    if (href.substr(href.lastIndexOf('/') + 1) == 'cards') {
        thisTrellisto.createCards();
        ran = 1;
    }
    setInterval(function () {
        var href = window.location.href;
        if (href.substr(href.lastIndexOf('/') + 1) == 'cards') {
            if (ran === 0) {
                ran = 1;
                thisTrellisto.createCards();
            }
        } else {
            ran = 0;
        }
    }, 500);

  } /*- $.trellisto -------------------------------*/

  // Set up the trellisto params
  var params = {}; // URL for your idea template page

  // Create a new trellisto object
  var tr = new $.trellisto(params);

}( jQuery ));