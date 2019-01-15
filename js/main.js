/*---------------------------------------------------------------------------------------------------
    
  Duende Trellisto, v1.1.5

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

    this.version                = manifest.version;
    this.releaseDate            = 'December 28, 2017';
    this.cardClassName          = 'list-card';//'card-grid-container';
    this.cardContainerClassName = 'card-grid-container';
    this.listClassName          = 'list-wrapper';
    this.cardHiddenClassName    = 'trellisto-hidden';
    this.cardClass              = '.' + this.cardClassName;
    this.cardContainerClass     = '.' + this.cardContainerClassName;
    this.listClass              = '.' + this.listClassName;
    this.boardClass             = '.member-cards-board';
    this.currentSettings        = { sortBy: 'board',
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

    this.trellistoInitCards = function () {

      var cards                     = [],
          lists                     = [],
          cardElements              = $(thisTrellisto.cardClass),
          uniqueListKeys            = [],
          //uniqueListKeysLength      = 0,
          uniqueListObj             = {},
          uniqueListObjSorted       = {},
          sortBy                    = thisTrellisto.getActiveSortByMenuItem();

        $.each(cardElements, function (i, el) {

          var cardEl           = sortBy == 'board' ? $(el) : $(el).closest('.js-card'),
              cardId           = cardEl.find('.card-short-id').length ?
                                 cardEl.find('.card-short-id').text() :
                                 '',
              scrumAndConsumed = thisTrellisto.getCardScrumFromBoard(el),
              dueDatePast      = cardEl.find('.is-due-past > .badge-text'),
              dueDateSoon      = cardEl.find('.is-due-soon > .badge-text'),
              dueDateFuture    = cardEl.find('.is-due-future > .badge-text'),
              dueDateObj       = {},
              listWrapperEl    = cardEl.closest(thisTrellisto.listClass),
              listEl           = listWrapperEl.find('.list'),
              listLabel        = sortBy == 'board' ?
                                 listEl.find('.list-header-name').text() :
                                 cardEl.closest(thisTrellisto.cardContainerClass).find('.list-card-position').children('strong:first-child').text(),
              //list             = thisTrellisto.formatName(listLabel),
              board            = sortBy == 'board' ?
                                 cardEl.closest(thisTrellisto.boardClass).find('.board-header a:first-child .board-header-btn-text').text() :
                                 cardEl.closest(thisTrellisto.cardContainerClass).find('.list-card-position > strong:last-child').text();

          // Check to make sure this label is not already
          // associated with an existing key. If it is,
          // then update the list variable to reflect that key
          for (k in uniqueListObj) {
            if (uniqueListObj[k] == listLabel) {
              var list = k;
            }
          }

          // If the list key was not found via a matching label...
          if (list === undefined) {

            // Generate a list key from the label
            list = thisTrellisto.formatName(listLabel);

            if (list in uniqueListObj) {
              var origList = list,
                  j       = i;

              while (list in uniqueListObj) {
                list = origList + '_' + j;
                j++;
                if (j == 1000) break; // limit
              }
            }

            uniqueListObj[list] = listLabel;
            uniqueListKeys.push(list);
          }

          // Update the list name data attribute in the DOM
          listWrapperEl.attr('data-trellisto-list-name', list);
          cardEl.closest(thisTrellisto.cardContainerClass).attr('data-trellisto-list-name', list);

          // dueDateObj
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

          // Push only unique board names to the array
          if (thisTrellisto.boards.indexOf(board) === -1) thisTrellisto.boards.push(board);
          
          // Update the card string
          var cardStr = sortBy == 'board' ? cardEl.prop('outerHTML') : cardEl.html();
          
          cards[cardId] = { cardId    : cardId,
                            cardStr   : cardStr,
                            scrum     : scrumAndConsumed.scrum,
                            consumed  : scrumAndConsumed.consumed,
                            dueDate   : dueDateObj,
                            list      : list,
                            listLabel : listLabel,
                            board     : board };
          
        });

        // Update the vars to store the
        // HTML for the card views
        thisTrellisto.updateCardsHTMLVars(sortBy);
        
        // Set the variable for cards
        thisTrellisto.cards = cards;
        
        // Sort list keys alphabetically
        uniqueListKeys.sort();

        for (i = 0; i < uniqueListKeys.length; i++) {
          k = uniqueListKeys[i];

          // Add to sorted list objects
          uniqueListObjSorted[k] = uniqueListObj[k];
        }

        // Update settings
        //thisTrellisto.currentSettings.filterListSettings = updatedFilterListSettings;

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

          var popOver     = $(this),
              popOverList = popOver.find('.pop-over-list');
            
          // If grouping by list, then add
          // check icon to 'Sort by list name' item
          popOverList.find('li.active').removeClass('active');

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
          if (popOver.find('.js-sort-by-list').length) return;
          
          // Append 'Sort by list name' item
          $('<li><a class="highlight-icon js-sort-by-list" href="#">Sort by list name <span class="icon-sm icon-check"></span></a></li>').appendTo(popOverList);

          // When DOM subtree of pop over title changes...
          popOver.find('.pop-over-header-title').bind('DOMSubtreeModified', function(e) {

            if (e.target.innerHTML.length > 0) {

              // If not the sort menu...
              if ($(this).text() == 'Filter Cards') {
                // Hide 'Sort by list' option
                popOver.find('.js-sort-by-list').hide();
              }
            }
          });

          // Pop over list items clicked...
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
        //chrome.storage.sync.clear(function() {
        //  console.log('Cleared');
        //  var error = chrome.runtime. lastError;
        //  if (error) {
        //      console.error(error);
        //  }
        //});     

        // Grab any current settings from local storage
        chrome.storage.sync.get(['currentSortBy', 'currentFilter'], function (result) {

          // Grab any favorite settings from local storage
          chrome.storage.sync.get(['defaultSortBy', 'defaultFilter'], function (favResult) {

            var updatedFilter = {};

            // Check if favorite settings exist
            thisTrellisto.favoriteSettingsExist = favResult.defaultSortBy ? true : false;
          
            // If local storage for current settings exists,
            // then update thisTrellisto.currentSettings with
            // the stored settings, 
            // otherwise set and save the current settings
            if (result.currentSortBy) {

              // Filter out any keys for missing lists
              //for (var k in result.currentFilter) {
              //  if (k == 'all' || uniqueListKeys.indexOf(k) > -1) {
              //    updatedFilter[k] = result.currentFilter[k];
              //  }
              //}
              
              thisTrellisto.currentSettings.filterListSettings = result.currentFilter; //updatedFilter;
              thisTrellisto.currentSettings.sortBy             = result.currentSortBy;
              
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
                thisTrellisto.currentSettings.filterListSettings[k].selected = 1
                thisTrellisto.currentSettings.filterListSettings[k].inDom = $('[data-trellisto-list-name="' + k + '"]').length;
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

              var sortBy = thisTrellisto.getActiveSortByMenuItem();

              // Update the vars to store the
              // HTML for the card views
              thisTrellisto.updateCardsHTMLVars(sortBy);

              thisTrellisto.filterCards(); // Show/hide the cards     

            });
          }); // /chrome.storage.sync.get(['defaultSortBy', 'defaultFilter'], function (result)
        }); // /chrome.storage.sync.get(['currentSortBy', 'currentFilter'], function (result)
    }

    // Create cards object
    this.trellistoInit = function () {

      //$('#content').bind('DOMNodeInserted', function () {
          
        //$('#content').unbind('DOMNodeInserted');

        var myVar = setInterval(function(){
                      if ($(thisTrellisto.cardClass).length) {
                        thisTrellisto.trellistoInitCards();
                        clearInterval(myVar);
                      } 
                    }, 3000);

      //}); // #content .bind
    }; // end - trellistoInit

    // Checks the cards title text and returns scrum points
    /*
    this.getCardScrum = function(el) {
      var scrum = $(el).find('.badge.point-count').not('.consumed').text();

      scrum = scrum && scrum != '' ? parseInt(scrum) : 0;

      // Remove parentheses
      //if (matchesScrum != null) scrum = matchesScrum[0].replace(/\(|\)/g,'');

      return scrum;

    };*/ // end - getCardScrum

    // Checks the cards title text and returns scrum points
    this.getCardScrumFromBoard = function(el) {

      var scrum    = $(el).find('.badge.point-count').not('.consumed').text(),
          consumed = $(el).find('.badge.point-count.consumed').text();

      scrum    = scrum && scrum != '' && !isNaN(scrum) ? parseInt(scrum) : 0;
      consumed = consumed && consumed != '' && !isNaN(consumed) ? parseInt(consumed) : 0;

      return { scrum: scrum,
               consumed: consumed };

    }; // end - getCardScrumFromBoard

    // Checks the cards title text and returns consumed points
    /*
    this.getCardConsumed = function(el) {
        var consumed = $(el).find('.badge.point-count.consumed').text();
        
        consumed = consumed && consumed != '' ? parseInt(consumed) : 0;

        // Remove brackets
        //if (matchesConsumed != null) consumed = matchesConsumed[0].replace(/\[|\]/g,'');

        return consumed;
    };*/ // end - getCardConsumed

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
        var filtered = {};

        for (cardId in thisTrellisto.cards) {
          var card = thisTrellisto.cards[cardId];   
          if (card.list == k) filtered[cardId] = card;
        }

        var inDom = $('[data-trellisto-list-name="' + k + '"]').length ? 1 : 0;

        // Update filterListSettings
        thisTrellisto.currentSettings.filterListSettings[k]['inDom'] = inDom;

        // Add the group if the list actually exists in Trello
        if (inDom) {
          output += thisTrellisto.createCardGroup(filtered, v.label, 'icon-list', k);
        }

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

        var listEl = $('[data-trellisto-list-name=' + k + ']');

        if (k == 'all') return; // Skip this iteration if 'All'

        // Make sure this list actually exists before we add a filter option for it
        if (listEl.length) {
          var checked = v.selected ? 'checked' : '';
          
          if (!v.selected) allChecked = '';
          
          $('<label for="filter-' + k + '"><input type="checkbox" class="list-filter" id="filter-' + k + '" data-trellisto-list-name="' + k + '"' + checked + ' >' + v.label + '</label>').appendTo(thisTrellisto.trellistoList);
        }

      });

      // Prepend All
      $('<label for="filter-all"><input type="checkbox" class="list-filter-all" id="filter-all" data-trellisto-list-name="all"' + allChecked + ' >All</label>').prependTo(thisTrellisto.trellistoList);

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

        cards.each(function() {

          var card   = $(this),
              cardId = card.find('.card-short-id').length ? card.find('.card-short-id').text() : false;

          if(cardId && !$(card).hasClass(thisTrellisto.cardHiddenClassName)) {

            thisTrellisto.cards[cardId].scrum;
            thisTrellisto.cards[cardId].consumed;

            scrumTotal    = scrumTotal + thisTrellisto.cards[cardId].scrum;
            consumedTotal = consumedTotal + thisTrellisto.cards[cardId].consumed;
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
          //inProgress       = '<div class="trellisto-inprogress-message">Trellisto functionality has been temporarily disabled by the Trello update to the Cards view :-( Thank you for your patience while we work on the fix! <a href="#" id="trellisto-inprogress-message-dismiss">Dismiss</a></div>';
      
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
      filterList       += '&nbsp;<span class="trellisto-settings__version">v' + thisTrellisto.version + ' (' + thisTrellisto.releaseDate + ')</span>';
      filterList       += '</div>';
      //filterList       += '</div>';

      if (!$('.u-gutter').find('#filter-list-menu').length) {

        // In Progress messaging
        //$(inProgress).appendTo('.js-content > .window-module');
        $('#trellisto-inprogress-message-dismiss').on('click', function(e){
          e.preventDefault();
          $('.trellisto-inprogress-message').hide();
        });

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
          $('.js-cards-content').html(thisTrellisto.sortByBoardContent);
        }
        //else {
        //  thisTrellisto.appendCardGroupsByBoard();
        //}
        
      }

      else
      if (isGroupByDueDate) {

        // Wait until Trello has loaded the Due Date content before updating the DOM with the filtered view
        $('.js-cards-content').bind('DOMNodeInserted', function () {

          // Immediately unbind to prevent function infinite calls
          $(this).unbind('DOMNodeInserted');
          
          if (thisTrellisto.sortByDueDateContent != '') {
            $('.js-cards-content').html(thisTrellisto.sortByDueDateContent);
          }

          else {
            thisTrellisto.appendCardGroupsByDueDate();
          }
        });
      }

      // Add items to the filter list
      thisTrellisto.appendFilterList();      

      // Filter cards
      thisTrellisto.filterCards();
    } // end - refreshGroups


    this.createCardGroup = function (cards, title, icon, k) {

      var winModule = '<div class="window-module"';

      winModule += typeof k !== 'undefined' ? ' data-trellisto-list-name="' + k + '"' : '';
      winModule += '><div class="window-module-title">';
      winModule += '<span class="window-module-title-icon icon-lg ' + icon + '"></span>';
      winModule += '<h3>' + title + '</h3></div><div class="u-gutter float-cards u-clearfix js-list">';

      // Construct a card for each object
      $.each(cards, function (i, card) {

        var listName    = card.list,
            cardClasses = thisTrellisto.cardContainerClassName,
            cardDisplay = '',
            dueDate     = card.dueDate.past ? card.dueDate.past : card.dueDate.future ? card.dueDate.future : false;

        // Add the hidden CSS class to the card if its list is not currently checked
        if (!thisTrellisto.currentSettings.filterListSettings[listName].selected) {
          cardClasses += ' ' + thisTrellisto.cardHiddenClassName;
          cardDisplay = ' style="display: none;"';
        }

        winModule += '<div class="' + cardClasses + '" data-trellisto-list-name="' + card.list + '"' + cardDisplay + '>';
        winModule +=   '<div class="js-card">' + card.cardStr + '</div>';
        winModule +=   '<p class="list-card-position quiet">' +
                    'in ' +
                    '<strong>' + card.listLabel + '</strong>' +
                    ' on <strong>' + card.board + '</strong>' +
                    '</p>';
        winModule += '</div>';
      });

      winModule += '</div></div>';

      return winModule;
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
      // Find all cards that contain a matching list
      var cardsInList = $(thisTrellisto.cardContainerClass).filter(function() {
        var listAttrVal = $(this).attr('data-trellisto-list-name');
        return listAttrVal == list;
      });
      return cardsInList;
    };

    // Returns an array with all cards in the list for the Board view
    this.getCardsInListByBoard = function (list) {
      var cardsInList = $(thisTrellisto.listClass).filter(function() {
        var listAttrVal = $(this).attr('data-trellisto-list-name');
        return listAttrVal == list;
      });
      return cardsInList;
    };

    // Returns an array with all cards in the list for the Board view
    this.getList = function (list) {
      var listEl = $('.window-module').filter(function() {
        var listAttrVal = $(this).attr('data-trellisto-list-name');
        return listAttrVal == list;
      });
      var cards = listEl.find(thisTrellisto.cardContainerClass);
      listEl = listEl.add(cards);
      return listEl;
    };

    this.filterCards = function () {

      var newFilterListSettings = thisTrellisto.currentSettings.filterListSettings;

      // Default all filter settings to invisible
      //for (k in newFilterListSettings) {
      //  newFilterListSettings[k].selected = 0;
      //}

      $('.list-filter:checked').each(function() {
        var listName    = this.id.replace('filter-', ''),
            selected;

        // Update the current setting for this checkbox
        newFilterListSettings[listName].selected = 1;

        if (thisTrellisto.currentSettings.sortBy == 'board') {
          var cardsInList = thisTrellisto.getCardsInListByBoard(listName)
          // Find all card parents that are already trellisto-hidden
          selected = $(cardsInList).filter('.trellisto-hidden');
        }
        else
        if (thisTrellisto.currentSettings.sortBy == 'list') {
          var listEl = thisTrellisto.getList(listName);
          // Find the list if it is already hidden
          selected = $(listEl).filter('.trellisto-hidden');
        }
        else {
          var cardsInList = thisTrellisto.getCardsInList(listName);
          // Find all card parents that are already trellisto-hidden
          selected = $(cardsInList).filter('.trellisto-hidden');
        }

        // Remove trellisto-hidden class from cards/lists
        $(selected).removeClass(thisTrellisto.cardHiddenClassName);
        $(selected).fadeIn();

      });

      $('.list-filter').not(':checked').each(function(i, el) {
        var listName    = this.id.replace('filter-', '');

        // Update the current setting for this checkbox
        newFilterListSettings[listName].selected = 0;

        if (thisTrellisto.currentSettings.sortBy == 'board') {
          var selected = thisTrellisto.getCardsInListByBoard(listName)
        }
        else
        if (thisTrellisto.currentSettings.sortBy == 'list') {
          var selected = thisTrellisto.getList(listName);
        }
        else {
          var selected = thisTrellisto.getCardsInList(listName);
        }

        // Add trellisto-hidden class to cards/lists
        $(selected).addClass(thisTrellisto.cardHiddenClassName);
        $(selected).fadeOut();
        
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
      if (thisTrellisto.currentSettings.sortBy == 'board') {
        thisTrellisto.boardClass
        $(thisTrellisto.boardClass).each(function() {
          var visibleChildren = $(this).find(thisTrellisto.listClass + ':not(.trellisto-hidden)');
          if (!visibleChildren.length && $(this).not(':hidden')) {
            $(this).fadeOut();
          } else if ($(this).is(':hidden')) {
            $(this).fadeIn();
          }
        });
      }
      else
      if (thisTrellisto.currentSettings.sortBy == 'dueDate'){
        $('.window-module').has('.window-module-title').each(function() {
          var visibleChildren = $(this).find(thisTrellisto.cardContainerClass + ':not(.trellisto-hidden)');
          if (!visibleChildren.length && $(this).not(':hidden')) {
            $(this).fadeOut();
          } else if ($(this).is(':hidden')) {
            $(this).fadeIn();
          }
        });
      }
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

  } // $.trellisto -------------------------------

  // Set up the trellisto params
  var params = {}; // URL for your idea template page

  // Create a new trellisto object
  var tr = new $.trellisto(params);

}( jQuery ));