/*---------------------------------------------------------------------------------------------------
    
  Duende Trellisto, v1.1.1

  Authors     : Barrett Cox (http://barrettcox.com),
                Amy Wu (http://duende.us)

  Description : A Chrome extension for Trello that displays
                all existing cards grouped by list.

  License     : MIT
  License URI : ../LICENSE.md

---------------------------------------------------------------------------------------------------*/

"use strict"

;(function ( $ ) {

  $.trellisto = function (params) {

    // Store a reference to this object prototype to
    // use as a reference within the methods
    var thisTrellisto = this;

    var manifest       = chrome.runtime.getManifest();

    this.version             = manifest.version;
    this.releaseDate         = 'February 24, 2017';
    this.cardClassName       = 'card-grid-container';
    this.cardHiddenClassName = 'trellisto-hidden';
    this.cardClass           = '.'+this.cardClassName;
    this.currentSettings     = { sortBy: 'board',
                                 filterListSettings: {
                                   all: {
                                     label: 'All',
                                     selected: 1
                                   }
                                 }
                               };

    this.trellistoList           = '#trellisto-pop-over-filter .trellisto-pop-over-list';
    this.cards                   = [];
    this.sortByBoardContent      = '';
    this.sortByDueDateContent    = '';
    this.boards                  = [];
    this.favoriteSettingsExist   = false;
    this.resetSettingsButtonHTML = '<button id="trellisto-reset-settings" class="trellisto-settings__button">Use Favorite</button>';

    // Create cards object
    this.trellistoInit = function () {

      $('#content').bind('DOMNodeInserted', function () {
          
        $('#content').unbind('DOMNodeInserted');

        var cards                = [],
            lists                = [],
            cardElements         = $(thisTrellisto.cardClass),
            uniqueListKeys       = []
            uniqueListKeysLength = 0,
            uniqueListObj        = {},
            uniqueListObjSorted  = {},
            sortBy               = thisTrellisto.getActiveSortByMenuItem();
  
        // Update the vars to store the
        // HTML for the card views
        thisTrellisto.updateCardsHTMLVars(sortBy);

        $.each(cardElements, function (i, el) {
            
          var jsCard        = $(el).find('.js-card').html(),
              scrum         = thisTrellisto.getCardScrum(el),
              consumed      = thisTrellisto.getCardConsumed(el),
              dueDatePast   = $(el).find('.is-due-past > .badge-text'),
              dueDateSoon   = $(el).find('.is-due-soon > .badge-text'),
              dueDateFuture = $(el).find('.is-due-future > .badge-text'),
              dueDateObj    = {},
              listLabel     = $(el).find('.list-card-position').children('strong:first-child').text(),
              board         = sortBy == 'board' ?
                              $(el).parents('.window-module').find('.window-module-title h3 a').text() :
                              $(el).find('.list-card-position > strong:last-child').text();

          if (dueDatePast.length) {
            dueDateObj.past = dueDatePast.text();
          }
          else
          if (dueDateSoon.length) {
            dueDateObj.soon = dueDateSoon.text();
          }
          else
          if (dueDateFuture.length) {
            dueDateObj.future = dueDateFuture.text();
          }
          else {
            dueDateObj.none = true;
          }

          // Format the list name
          list = thisTrellisto.formatName(listLabel);

          // Add only unique list names to the object
          if (!(list in uniqueListObj)) {
            uniqueListObj[list] = listLabel;
            uniqueListKeys.push(list);
          }

          // Push only unique board names to the array
          if (thisTrellisto.boards.indexOf(board) === -1) thisTrellisto.boards.push(board);
          
          cards.push({ jsCard    : jsCard,
                       scrum     : scrum,
                       consumed  : consumed,
                       dueDate   : dueDateObj,
                       list      : list,
                       listLabel : listLabel,
                       board     : board }); 
        });

        // Set the global variable for cards
        thisTrellisto.cards = cards;
        
        // Sort list keys alphabetically
        uniqueListKeys.sort();
        uniqueListKeysLength = uniqueListKeys.length;
        for (i = 0; i < uniqueListKeysLength; i++) {
          k = uniqueListKeys[i];
          uniqueListObjSorted[k] = uniqueListObj[k];
        }

        chrome.storage.sync.get(['defaultSortBy', 'defaultFilter'], function (result) {
          if(result.defaultSortBy) {
            return true;
          }
          else {
            return false;
          }
        });

        // Pop over list
        $('.pop-over').bind('DOMNodeInserted', function () {
            
          // If grouping by list, then add
          // check icon to 'Sort by list name' item
          $('.pop-over-list li.active').removeClass('active');
          if (thisTrellisto.currentSettings.sortBy == 'list') {
            $('.js-sort-by-list').parent().addClass('active');
          }
          else
          if (thisTrellisto.currentSettings.sortBy == 'board') {
            $('.js-sort-by-board').parent().addClass('active');
          }
          else
          if (thisTrellisto.currentSettings.sortBy == 'dueDate') {
            $('.js-sort-by-due-date').parent().addClass('active');
          }

          // Return if 'Sort by list name' item exists
          if ($('.pop-over').find('.js-sort-by-list').length) return;
          
          // Append 'Sort by list name' item
          $('<li><a class="highlight-icon js-sort-by-list" href="#">Sort by list name <span class="icon-sm icon-check"></span></a></li>').appendTo('.pop-over-list');
          
          // Pop over list items
          $('.pop-over-list li > a').click( function() {

            var sortBy;

            if ($(this).hasClass('js-sort-by-list')) {
              sortBy = 'list';
            }
            else
            if ($(this).hasClass('js-sort-by-board')) {
              sortBy = 'board';
            }
            else
            if ($(this).hasClass('js-sort-by-due-date')) {
              sortBy = 'dueDate';
            }

            // Enable the Save Favorite button if sortBy changed
            if (sortBy != thisTrellisto.currentSettings.sortBy) {
              thisTrellisto.enableSaveButton();
            }

            thisTrellisto.refreshGroups(sortBy, thisTrellisto.currentSettings.filterListSettings);

          }); // $('.pop-over-list li > a').click()

        }); // /$('.pop-over').bind()
        
        // Clears sync storage for testing purposes
        /*
        chrome.storage.sync.clear(function() {
          console.log('Cleared');
          var error = chrome.runtime.lastError;
          if (error) {
              console.error(error);
          }
        });
        */

        // Grab any current settings from local storage
        chrome.storage.sync.get(['currentSortBy', 'currentFilter'], function (result) {
          // Grab any favorite settings from local storage
          chrome.storage.sync.get(['defaultSortBy', 'defaultFilter'], function (result) {
            // Check if favorite settings exist
            thisTrellisto.favoriteSettingsExist = result.defaultSortBy ? true : false;
          
            // If local storage for current settings exists,
            // then update thisTrellisto.currentSettings with
            // the stored settings, 
            // otherwise set and save the current settings
            if (result.currentSortBy) {
              thisTrellisto.currentSettings.sortBy = result.currentSortBy;
              thisTrellisto.currentSettings.filterListSettings = result.currentFilter;

              // Delete any old filter settings that no longer exist
              /*
              $.each(thisTrellisto.currentSettings.filterListSettings, function (k, v) {
                if (uniqueListsArray.indexOf(v.label) === -1) delete thisTrellisto.currentSettings.filterListSettings[k];
              });
              */

              // Add any new filter settings
              $.each(uniqueListObjSorted, function (k, v) {
                // If list name already saved locally, then skip this iteration...
                if (thisTrellisto.currentSettings.filterListSettings[k]) return; 
                // ...otherwise, update the settings and save locally
                thisTrellisto.currentSettings.filterListSettings[k] = {};
                thisTrellisto.currentSettings.filterListSettings[k].label = v;
                thisTrellisto.currentSettings.filterListSettings[k].selected = 0;
              });

              // Update & Save current settings
              thisTrellisto.updateCurrentSettings(thisTrellisto.currentSettings.sortBy,
                                                  thisTrellisto.currentSettings.filterListSettings);
              thisTrellisto.saveCurrentSettings(thisTrellisto.currentSettings.sortBy,
                                                thisTrellisto.currentSettings.filterListSettings);
            }
            else {
              console.log('No storage');

              // Store the list labels in an object with
              // a formatted listName as the key
              $.each(uniqueListObjSorted, function (k, v) {
                thisTrellisto.currentSettings.filterListSettings[k] = {};
                thisTrellisto.currentSettings.filterListSettings[k].label = v;
                thisTrellisto.currentSettings.filterListSettings[k].selected = 1;
              });
              thisTrellisto.updateCurrentSettings(thisTrellisto.currentSettings.sortBy,
                                                  thisTrellisto.currentSettings.filterListSettings);
              thisTrellisto.saveCurrentSettings(thisTrellisto.currentSettings.sortBy,
                                                thisTrellisto.currentSettings.filterListSettings);
            }

            thisTrellisto.makeFilterMenu();
            thisTrellisto.refreshGroups(thisTrellisto.currentSettings.sortBy, thisTrellisto.currentSettings.filterListSettings);
            //thisTrellisto.calculateScrum();

            // Cards have been inserted
            $('.js-content').debouncedDNI(function () {

              // Return if scrum values have been added
              // This terminates redundant function calls
              if ($('.js-content').find('[class="groupbylist-scrum-total"]').length) return;

              console.log('popover DOMNodeInserted');

              var sortBy = thisTrellisto.getActiveSortByMenuItem();

              // Update the vars to store the
              // HTML for the card views
              thisTrellisto.updateCardsHTMLVars(sortBy);

              thisTrellisto.filterCards(); // Show/hide the cards     

            });
          }); // /chrome.storage.sync.get(['defaultSortBy', 'defaultFilter'], function (result)
        }); // /chrome.storage.sync.get(['currentSortBy', 'currentFilter'], function (result)
      }); // #content .bind
    }; // end - trellistoInit

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
    this.appendCardGroupsByList = function() {

      var output = '';
      
      $.each(thisTrellisto.currentSettings.filterListSettings, function (k, v) {

        if (k == 'all') return; // In .each loop, returning anything other than false behaves like continue;

        var scrumTotal    = 0,
            consumedTotal = 0;

        // Find all cards for this list
        var filtered = thisTrellisto.cards.filter(function(obj) {
          return obj.list == k;
        });

        output += thisTrellisto.createCardGroup(filtered, v.label, 'icon-list');

      });

      // Clear all card groups
      thisTrellisto.clearContent();

      // Add group to the DOM
      $('.js-cards-content').html(output);

    }; // end - appendCardGroupsByList


    // Generates "Sort by Due Date"
    // card groups
    this.appendCardGroupsByDueDate = function() {

      var dueDatePast      = [],
          dueDateNextDay   = [],
          dueDateNextWeek  = [],
          dueDateNextMonth = [],
          dueDateLater     = [],
          dueDateNone      = [],
          output           = '';

      $.each(thisTrellisto.cards, function (i, card) {

        var dueDateFuture  = card.dueDate.future,
            currentDate    = new Date(),
            tomorrow       = new Date(),
            nextWeek       = new Date(),
            nextMonth      = thisTrellisto.addMonths(currentDate, 1);
        
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextWeek.setDate(nextWeek.getDate() + 7);

        tomorrow  = tomorrow.getTime();
        nextWeek  = nextWeek.getTime();
        nextMonth = nextMonth.getTime();

        if (card.dueDate.past) {
          dueDatePast.push(card);
        }
        else
        if (card.dueDate.soon) {
          dueDateNextDay.push(card);
        }
        else
        if (dueDateFuture) {
          var dateArray = dueDateFuture.split(' ');
          if (dateArray.length < 3) {
            var currentYear = new Date().getFullYear();
            dueDateFuture += ' ' + currentYear;
          }
          var timestampFuture = new Date(dueDateFuture).getTime();

          if (timestampFuture > nextMonth) {
            dueDateLater.push(card);   
          }
          else
          if (timestampFuture > nextWeek) {
            dueDateNextMonth.push(card); 
          }
          else
          if (timestampFuture > tomorrow) {
            dueDateNextWeek.push(card); 
          }
        }
        else {
          dueDateNone.push(card);
        }
      });

      if (dueDatePast.length) output      += thisTrellisto.createCardGroup(dueDatePast, 'Overdue Cards', 'icon-clock');
      if (dueDateNextDay.length) output   += thisTrellisto.createCardGroup(dueDateNextDay, 'Due in the Next Day', 'icon-clock');
      if (dueDateNextWeek.length) output  += thisTrellisto.createCardGroup(dueDateNextWeek, 'Due in the Next 7 Days', 'icon-clock');
      if (dueDateNextMonth.length) output += thisTrellisto.createCardGroup(dueDateNextMonth, 'Due in the Next Month', 'icon-clock');
      if (dueDateLater.length) output     += thisTrellisto.createCardGroup(dueDateLater, 'Due Later', 'icon-clock');
      if (dueDateNone.length) output      += thisTrellisto.createCardGroup(dueDateNone, 'Cards with No Due Date', 'icon-card');
      
      // Clear all card groups
      thisTrellisto.clearContent();

      // Add group to the DOM
      $('.js-cards-content').html(output);

    }; // end - appendCardGroupsByDueDate

    this.appendFilterList = function() {

      var allChecked = 'checked';

      // Clear the current list
      $(thisTrellisto.trellistoList).html('');

      $.each(thisTrellisto.currentSettings.filterListSettings, function (k, v) {

        if (k == 'all') return; // Skip this iteration if 'All'

        var checked = v.selected ? 'checked' : '';

        if (!v.selected) allChecked = '';

        $('<label for="filter-' + k + '"><input type="checkbox" class="list-filter" id="filter-' + k + '" data-trellisto-name="' + k + '"' + checked + ' >' + v.label + '</label>').appendTo(thisTrellisto.trellistoList);
      });

      // Prepend All
      $('<label for="filter-all"><input type="checkbox" class="list-filter-all" id="filter-all" data-trellisto-name="all"' + allChecked + ' >All</label>').prependTo(thisTrellisto.trellistoList);

    }; // end - appendFilterList

    // Create the Filter menu
    this.calculateScrum = function() {

      var group = $('.js-cards-content .window-module');

      if ($('.groupbylist-consumed-total').length) {
        $('.groupbylist-consumed-total').remove();
      }

      if ($('.groupbylist-scrum-total').length) {
        $('.groupbylist-scrum-total').remove();
      }

      // Calculate and add total scrum/consumed points to each card group
      $.each(group, function (i, grp) {
        var scrumTotal    = 0,
            consumedTotal = 0,
            cards         = $(grp).find(thisTrellisto.cardClass),
            groupTitle    = $(grp).find('.window-module-title');

        $.each(cards, function (i, card) {
          if(!$(card).hasClass(thisTrellisto.cardHiddenClassName)) {
            scrumTotal    += parseFloat(thisTrellisto.getCardScrum(card));
            consumedTotal += parseFloat(thisTrellisto.getCardConsumed(card));
          }
        });

        $('<span class="groupbylist-consumed-total">' + consumedTotal + '</span><span class="groupbylist-scrum-total">' + scrumTotal + '</span>').appendTo(groupTitle);
      });  
    }; // end - calculateScrum

    // Returns a date object for the same
    // day [count] months from now
    this.addMonths = function (date, count) {
      if (date && count) {
        var m, d = (date = new Date(+date)).getDate()

        date.setMonth(date.getMonth() + count, 1)
        m = date.getMonth()
        date.setDate(d)
        if (date.getMonth() !== m) date.setDate(0)
      }
      return date
    }

    // Create the Filter menu
    this.makeFilterMenu = function() {
      
      var filterListButton = '',
          filterList       = '';

      filterListButton += '<a id="filter-list-menu" class="quiet-button mod-with-image" href="#">';
      filterListButton +=     '<span class="icon-sm icon-overflow-menu-horizontal quiet-button-icon"></span>';
      filterListButton +=     '<span class="">Filter</span>';
      filterListButton += '</a>';

      filterList       += '<div id="trellisto-pop-over-filter" class="trellisto-pop-over">';
      filterList       +=    '<div class="pop-over-header js-pop-over-header">';
      filterList       +=        '<a class="pop-over-header-back-btn icon-sm icon-back js-back-view" href="#"></a>';
      filterList       +=        '<span class="pop-over-header-title js-fill-pop-over-title">Filter Cards</span>';    
      filterList       +=        '<a class="pop-over-header-close-btn icon-sm icon-close js-trellisto-filter-close" href="#"></a>';
      filterList       +=    '</div>';
      filterList       +=    '<div class="trellisto-pop-over-content">';
      filterList       +=        '<div>';
      filterList       +=            '<ul class="trellisto-pop-over-list checkable">';
      filterList       +=            '</ul>';
      filterList       +=        '</div>';
      filterList       +=    '</div>';
      filterList       += '</div>';

      filterList       += '<div class="trellisto-settings">';
      filterList       += '<span id="trellisto-settings-title" class="trellisto-settings__label"><span class="icon-sm icon-gear trellisto-settings__label__icon"></span><span>Trellisto Settings:</span></span>';
      filterList       += thisTrellisto.favoriteSettingsExist ? thisTrellisto.resetSettingsButtonHTML : '';
      //filterList       += '<button id="trellisto-reset-settings" class="trellisto-settings__button">Use Favorite</button>';
      filterList       += '<button id="trellisto-save-settings" class="trellisto-settings__text-button">Save Favorite</button>';
      filterList       += '</div>';

      filterList       += '<div class="trellisto-settings">';
      filterList       += '<div class="trellisto-settings__label"><span class="icon-sm icon-information trellisto-settings__label__icon"></span><span>Questions or comments about Trellisto?</span> <a href="mailto:trellisto@duende.us?subject=Feedback About Trellisto v' + thisTrellisto.version + '">Send Feedback</a>';
      filterList       += '<span class="trellisto-settings__version">v' + thisTrellisto.version + ' (' + thisTrellisto.releaseDate + ')</span>';
      filterList       += '</div>';
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

        // Save and reset settings buttons
        var saveSettingsButton  = $('#trellisto-save-settings'),
            resetSettingsButton = $('#trellisto-reset-settings');
        if (saveSettingsButton.length) {
          saveSettingsButton.click(function(){
            $(this).prop('disabled', 'disabled');
            $(this).addClass('trellisto-settings__text-button--saved');
            $(this).html('Saved <span class="icon-sm icon-check"></span>');
            if (!$('#trellisto-reset-settings').length) {
              $(thisTrellisto.resetSettingsButtonHTML).insertAfter('#trellisto-settings-title');
              $('#trellisto-reset-settings').unbind('click');
              $('#trellisto-reset-settings').click(thisTrellisto.resetSettingsButtonClick);
            }
            thisTrellisto.saveFavoriteSettings();
          });
        }
        if (resetSettingsButton.length) {
          resetSettingsButton.click(thisTrellisto.resetSettingsButtonClick);
        }
      }

      $(thisTrellisto.trellistoList).on('change', '.list-filter-all', function (e) {
        //e.preventDefault();

        thisTrellisto.enableSaveButton();

        // Show all hidden groups
        $('.window-module').has(thisTrellisto.cardClass).each(function() {
          if ($(this).is(':hidden')) {
            $(this).fadeIn();
          }
        });
        // Show all cards
        $(thisTrellisto.cardClass).fadeIn();

        if($(this).is(':checked')) {
          $('.list-filter').prop('checked', true);
          $(this).parent().addClass('trellisto-is-checked');
          $('.list-filter').parent().addClass('trellisto-is-checked');
        }
        else {
          $('.list-filter').prop('checked', false);
          $(this).parent().removeClass('trellisto-is-checked');
          $('.list-filter').parent().removeClass('trellisto-is-checked');
        }
        thisTrellisto.filterCards();
      }); // .list-filter-all.on(change)

      $(thisTrellisto.trellistoList).on('change', '.list-filter', function (e) {
        //e.preventDefault();

        thisTrellisto.enableSaveButton();

        if($(this).is(':checked')) {
          if ($('.list-filter').not(':checked').length == 0) {
            $('#filter-all').prop('checked', true);
            $('#filter-all').parent().addClass('trellisto-is-checked');
          }
          $(this).parent().addClass('trellisto-is-checked');
        }
        else {
          $('#filter-all').prop('checked', false);
          $('#filter-all').parent().removeClass('trellisto-is-checked');
          $(this).parent().removeClass('trellisto-is-checked');
        }
        thisTrellisto.filterCards();

      }); // .list-filter.on(change)
    }; // end - makeFilterMenu

    this.refreshGroups = function (sortBy, filterListSettings) {

      var isGroupByList    = sortBy == 'list' ? 1 : 0,
          isGroupByBoard   = sortBy == 'board' ? 1 : 0,
          isGroupByDueDate = sortBy == 'dueDate' ? 1 : 0;

      thisTrellisto.updateCurrentSettings(sortBy, filterListSettings);
      thisTrellisto.saveCurrentSettings(sortBy, filterListSettings);

      // If Sort by list name
      if (isGroupByList) {
        // Update 'Sort by []' label
        $('.js-sort-text > strong:first-child').text('list name');
        // Hide the popover list
        $('.pop-over').removeClass('is-shown');
        // Clear the popover list
        $('.pop-over').find('.pop-over-content').html('');
        // Append list card group to the DOM
        thisTrellisto.appendCardGroupsByList();
      }
      else
      if (isGroupByBoard) {
        $('.js-sort-text > strong:first-child').text('board');
        if (thisTrellisto.sortByBoardContent != '') {
          $('.js-cards-content').html('<div id="bsc_test"></div>' + thisTrellisto.sortByBoardContent);
        }
        /*
        else {
          thisTrellisto.appendCardGroupsByBoard();
        }
        */
      }
      else
      if (isGroupByDueDate) {
        $('.js-sort-text > strong:first-child').text('due date');
        if (thisTrellisto.sortByDueDateContent != '') {
          $('.js-cards-content').html('<div id="bsc_test"></div>' + thisTrellisto.sortByDueDateContent);
        }
        else {
          thisTrellisto.appendCardGroupsByDueDate();
        }
      }

      // Add items to the filter list
      thisTrellisto.appendFilterList();      

      // Filter cards
      thisTrellisto.filterCards();
    } // end - refreshGroups


    this.createCardGroup = function (cards, title, icon) {

      var module = '<div class="window-module"><div class="window-module-title">' +
                   '<span class="window-module-title-icon icon-lg ' + icon + '"></span>' +
                   '<h3>' + title + '</h3></div><div class="u-gutter float-cards u-clearfix js-list">';

      // Construct a card for each object
      $.each(cards, function (i, card) {

        var listName    = card.list,
            cardClasses = thisTrellisto.cardClassName,
            cardDisplay = '',
            dueDate     = card.dueDate.past ? card.dueDate.past : card.dueDate.future ? card.dueDate.future : false;

        // Add the hidden CSS class to the card if its list is not currently checked
        if (!thisTrellisto.currentSettings.filterListSettings[listName].selected) {
          cardClasses += ' ' + thisTrellisto.cardHiddenClassName;
          cardDisplay = ' style="display: none;"';
        }

        module += '<div class="' + cardClasses + '"' + cardDisplay + '>';
        module +=   '<div class="js-card">' + card.jsCard + '</div>';
        module +=   '<p class="list-card-position quiet">' +
                    'in ' +
                    '<strong>' + card.listLabel + '</strong>' +
                    ' on <strong>' + card.board + '</strong>' +
                    '</p>';
        module += '</div>';
      });

      module += '</div></div>';

      return module;
    };

    // Returns a string indicating the current
    // sortBy state of the card list:
    // 'list', 'board', or 'dueDate'
    this.getActiveSortByMenuItem = function () {
      var menuLabel = $('.js-sort-text > strong:first-child'),
          sortBy;
      if (menuLabel.length) {
        if (menuLabel.text().indexOf('list') !== -1) {
          sortBy = 'list';
        }
        else
        if (menuLabel.text().indexOf('board') !== -1) {
          sortBy = 'board';
        }
        else
        if (menuLabel.text().indexOf('due date') !== -1) {
          sortBy = 'dueDate';
        }
        return sortBy;
      }
      else {
        return false;
      }
    };

    // Stores the 'Sort by board',
    // or 'Sort by due date' cards list HTML
    // in a variable 
    this.updateCardsHTMLVars = function (sortBy) {
      if (sortBy == 'board') {
        thisTrellisto.sortByBoardContent = $('.js-cards-content').html(); 
      }
      else
      if (sortBy == 'dueDate') {
        thisTrellisto.sortByDueDateContent = $('.js-cards-content').html(); 
      }
      return;
    }

    // Returns an array with all cards in the list
    this.getCardsInList = function (list) {
      //var list = thisTrellisto.currentSettings.filterListSettings[list];
      // Find all cards that contain a matching list
      var cardsInList = $(thisTrellisto.cardClass).filter(function() {
        var label     = $(this).find('.list-card-position > strong:first-child').text(),
            formatted = thisTrellisto.formatName(label);
        return formatted == list;
      });
      return cardsInList;
    };

    this.filterCards = function () {

      var newFilterListSettings = thisTrellisto.currentSettings.filterListSettings;

      $('.list-filter:checked').each(function() {
        var listName    = this.id.replace('filter-', ''),
            cardsInList = thisTrellisto.getCardsInList(listName);

        // Update the current setting for this checkbox
        newFilterListSettings[listName].selected = 1;

        // Find all card parents that are already trellisto-hidden
        cardsInList = $(cardsInList).filter('.trellisto-hidden');

        // Remove trellisto-hidden class from cards
        $(cardsInList).removeClass(thisTrellisto.cardHiddenClassName);

        $(cardsInList).fadeIn();
      });

      $('.list-filter').not(':checked').each(function(i, el) {
        var listName    = this.id.replace('filter-', ''),
            cardsInList = thisTrellisto.getCardsInList(listName);

        // Update the current setting for this checkbox
        newFilterListSettings[listName].selected = 0;

        // Add trellisto-hidden class to cardsInList
        $(cardsInList).addClass(thisTrellisto.cardHiddenClassName);

        $(cardsInList).fadeOut();
      });

      thisTrellisto.updateCurrentSettings(thisTrellisto.currentSettings.sortBy, newFilterListSettings);
      thisTrellisto.saveCurrentSettings(thisTrellisto.currentSettings.sortBy, newFilterListSettings);
      thisTrellisto.showOrHideGroups();
      thisTrellisto.calculateScrum();
    }; // end - filterCards */

    this.formatName = function (list) {
      var formatted = list.replace(/[^a-zA-Z0-9 ]/g, ""),
          formatted = formatted.replace(/ /g, "_"),
          formatted = formatted.toLowerCase();
      return formatted;
    };

    // Hides the entire group if all children are hidden,
    // or shows the group if any children are visible
    this.showOrHideGroups = function() {
      $('.window-module').has('.window-module-title').each(function() {
        var visibleChildren = $(this).find(thisTrellisto.cardClass+':not(.trellisto-hidden)');
        if (!visibleChildren.length && $(this).not(':hidden')) {
          $(this).fadeOut();
        } else if ($(this).is(':hidden')) {
          $(this).fadeIn();
        }
      });
    };

    // Remove all card groups from the DOM
    this.clearContent = function () {
      $('.js-cards-content').html('');
    };

    this.enableSaveButton = function () {
      var saveSettingsButton  = $('#trellisto-save-settings');
      if (saveSettingsButton.length) {
        saveSettingsButton.removeAttr('disabled');
        saveSettingsButton.removeClass('trellisto-settings__text-button--saved');
        saveSettingsButton.html('Save Favorite');
      }
    };
    this.updateCurrentSettings = function (sortBy, filterListSettings) {
      thisTrellisto.currentSettings.sortBy = sortBy;
      thisTrellisto.currentSettings.filterListSettings = filterListSettings;
      return;
    };
    this.saveCurrentSettings = function (sortBy, filterListSettings) {
      // Update the object so that it can be referenced in other
      // functions

      // Save the settings in local storage
      chrome.storage.sync.set({ 'currentSortBy': sortBy,
                                'currentFilter': filterListSettings },
                                function() {
                                  /*
                                  console.log( 'Current settings saved' );
                                  console.log( 'sortBy: ' +
                                               thisTrellisto.currentSettings.sortBy +
                                               ', filter: ' +
                                               thisTrellisto.currentSettings.filterListSettings );
                                  */
                                  return;
                                });
    };

    // Saves the current settings
    // configurations as the favorite
    this.saveFavoriteSettings = function () {

      var defaultSortBy = thisTrellisto.currentSettings.sortBy,
          defaultFilter = thisTrellisto.currentSettings.filterListSettings;

      chrome.storage.sync.set({ 'defaultSortBy': defaultSortBy,
                                'defaultFilter': defaultFilter },
                                function() {
                                  /*
                                  console.log('saveFavoriteSettings');
                                  console.log(defaultFilter);
                                  */
                                  return;
                                });
    };

    // Restores the settings to the saved default
    this.restoreFavoriteSettings = function () {
      chrome.storage.sync.get(['defaultSortBy', 'defaultFilter'], function (result) {
        thisTrellisto.refreshGroups(result.defaultSortBy, result.defaultFilter);
        return;
      });
    };

    this.resetSettingsButtonClick = function () {
      console.log('clicked');
      thisTrellisto.restoreFavoriteSettings();
      return;
    };

    var ran = 0;
    var href = window.location.href;
    if (href.substr(href.lastIndexOf('/') + 1) == 'cards') {
        thisTrellisto.trellistoInit();
        ran = 1;
    }
    setInterval(function () {
        var href = window.location.href;
        if (href.substr(href.lastIndexOf('/') + 1) == 'cards') {
            if (ran === 0) {
                ran = 1;
                thisTrellisto.trellistoInit();
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