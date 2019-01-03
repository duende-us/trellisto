/*---------------------------------------------------------------------------------------------------
    
  Duende Trellisto, v1.1.2

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

      var cards                = [],
          lists                = [],
          cardElements         = $(thisTrellisto.cardClass),
          uniqueListKeys       = [],
          uniqueListKeysLength = 0,
          uniqueListObj        = {},
          uniqueListObjSorted  = {},
          sortBy               = thisTrellisto.getActiveSortByMenuItem();

        $.each(cardElements, function (i, el) {

          var jsCard           = sortBy == 'board' ? $(el).prop('outerHTML') : $(el).closest('.js-card').html(),
              //jsCard        = sortBy == 'board' ? $(el).html : $(el).find('.js-card').html(),

              //scrum         = thisTrellisto.getCardScrum(el),
              //consumed      = thisTrellisto.getCardConsumed(el),

              scrumAndConsumed = thisTrellisto.getCardScrumFromBoard(el),
              dueDatePast      = $(el).find('.is-due-past > .badge-text'),
              dueDateSoon      = $(el).find('.is-due-soon > .badge-text'),
              dueDateFuture    = $(el).find('.is-due-future > .badge-text'),
              dueDateObj       = {},
              listWrapperEl    = $(el).closest(thisTrellisto.listClass),
              listEl           = listWrapperEl.find('.list'),
              listLabel        = sortBy == 'board' ?
                                 listEl.find('.list-header-name').text() :
                                 $(el).closest(thisTrellisto.cardContainerClass).find('.list-card-position').children('strong:first-child').text(),
              board            = sortBy == 'board' ?
                                 $(el).closest(thisTrellisto.boardClass).find('.board-header a:first-child .board-header-btn-text').text() : //$(el).parents('.window-module').find('.window-module-title h3 a').text() :
                                 $(el).closest(thisTrellisto.cardContainerClass).find('.list-card-position > strong:last-child').text();

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

          // If list key already exists in the object...
          if (list in uniqueListObj) {

            // If the listLabel value in the object is different than listLabel
            if (uniqueListObj[list] != listLabel) {

              // Change the list key so to make it unique
              list += '_' + i;
            }
          }

          // Add only unique list names to the object
          if (!(list in uniqueListObj)) {
            uniqueListObj[list] = listLabel;
            uniqueListKeys.push(list);
          }

          // Update the list name data attribute in the DOM
          if (sortBy == 'board') {
            //console.log('listWrapperEl.length:');
            //console.log(listWrapperEl.length);
            console.log('listWrapperEl:');
            console.log(listWrapperEl);
          listWrapperEl.attr('data-trellisto-list-name', list);
          //console.log(listWrapperEl.attr('data-trellisto-list-name'));
        }

          // Push only unique board names to the array
          if (thisTrellisto.boards.indexOf(board) === -1) thisTrellisto.boards.push(board);
          
          cards.push({ jsCard    : jsCard,
                       scrum     : scrumAndConsumed.scrum,
                       consumed  : scrumAndConsumed.consumed,
                       dueDate   : dueDateObj,
                       list      : list,
                       listLabel : listLabel,
                       board     : board });
          
        });

        // Update the vars to store the
        // HTML for the card views
        thisTrellisto.updateCardsHTMLVars(sortBy);
        
        // Set the variable for cards
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

            // Check if favorite settings exist
            thisTrellisto.favoriteSettingsExist = favResult.defaultSortBy ? true : false;
          
            // If local storage for current settings exists,
            // then update thisTrellisto.currentSettings with
            // the stored settings, 
            // otherwise set and save the current settings
            if (result.currentSortBy) {

              thisTrellisto.currentSettings.sortBy = result.currentSortBy;
              thisTrellisto.currentSettings.filterListSettings = result.currentFilter;

              // Delete any old filter settings that no longer exist
              //$.each(thisTrellisto.currentSettings.filterListSettings, function (k, v) {
              //  if (uniqueListsArray.indexOf(v.label) === -1) delete thisTrellisto.currentSettings.filterListSettings[k];
              //});
              
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
    this.getCardScrum = function(el) {
      var title        = $(el).find('.list-card-title').text(),
          regExpScrum  = /\(\d*\.?\d*\)/,
          matchesScrum = regExpScrum.exec(title),
          scrum        = 0;

      // Remove parentheses
      if (matchesScrum != null) scrum = matchesScrum[0].replace(/\(|\)/g,'');

      return scrum;

    }; // end - getCardScrum

    // Checks the cards title text and returns scrum points
    this.getCardScrumFromBoard = function(el) {

      var scrum   = $(el).find('.badge.point-count').not('.consumed').text(),
          consumed = $(el).find('.badge.point-count.consumed').text();

          scrum = scrum ? scrum : 0;
          consumed = consumed ? consumed : 0;

      return { scrum: scrum,
               consumed: consumed };

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

        output += thisTrellisto.createCardGroup(filtered, v.label, 'icon-list', k);

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

        $('<label for="filter-' + k + '"><input type="checkbox" class="list-filter" id="filter-' + k + '" data-trellisto-list-name="' + k + '"' + checked + ' >' + v.label + '</label>').appendTo(thisTrellisto.trellistoList);
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
          $('.js-cards-content').html('<div id="bsc_test"></div>' + thisTrellisto.sortByBoardContent);
        }
        //else {
        //  thisTrellisto.appendCardGroupsByBoard();
        //}
        
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


    this.createCardGroup = function (cards, title, icon, k) {

      var module = '<div class="window-module"';

      module += typeof k !== 'undefined' ? ' data-trellisto-list-name="' + k + '"' : '';
      module += '><div class="window-module-title">';
      module += '<span class="window-module-title-icon icon-lg ' + icon + '"></span>';
      module += '<h3>' + title + '</h3></div><div class="u-gutter float-cards u-clearfix js-list">';


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

        //<div class="card-grid-container">
          //<div class="js-card">
            //<a class="list-card js-member-droppable ui-droppable" href="/c/vM9VBAT8/5-fix-contact-us-page-alignment-issues-https-wwwspigitcom-contact-us"><div class="list-card-cover js-card-cover"></div><span class="icon-sm icon-edit list-card-operation dark-hover js-open-quick-card-editor js-card-menu"></span><div class="list-card-stickers-area hide"><div class="stickers js-card-stickers"></div></div><div class="list-card-details"><div class="list-card-labels js-card-labels"><span class="card-label card-label-green mod-card-front" title="Completed.">Completed.</span></div><span class="list-card-title js-card-name" dir="auto"><span class="card-short-id hide">#5</span>Fix Contact us page alignment issues https://www.spigit.com/contact-us/</span><div class="badges"><span class="js-badges"><div class="badge is-icon-only" title="You are subscribed to this card."><span class="badge-icon icon-sm icon-subscribe"></span></div><div class="badge is-due-past" title="This card is past due."><span class="badge-icon icon-sm icon-clock"></span><span class="badge-text">Jul 9, 2015</span></div><div class="badge" title="Comments"><span class="badge-icon icon-sm icon-comment"></span><span class="badge-text">2</span></div></span><span class="js-plugin-badges"><span></span></span></div><div class="list-card-members js-list-card-members"><div class="member js-member-on-card-menu" data-idmem="5320cba8d807417f7d2e1f58"><img class="member-avatar" height="30" width="30" src="https://trello-avatars.s3.amazonaws.com/6539e78ce1149b83e78885c8ea9b717e/30.png" srcset="https://trello-avatars.s3.amazonaws.com/6539e78ce1149b83e78885c8ea9b717e/30.png 1x, https://trello-avatars.s3.amazonaws.com/6539e78ce1149b83e78885c8ea9b717e/50.png 2x" alt="Chris Goelkel (chrisgoelkel)" title="Chris Goelkel (chrisgoelkel)"><span class="member-gold-badge" title="This member has Trello Gold."></span></div><div class="member js-member-on-card-menu" data-idmem="5553b8316515502121fae5d1"><img class="member-avatar" height="30" width="30" src="https://trello-avatars.s3.amazonaws.com/95db28b493c6b5d2c39e85afd0701f79/30.png" srcset="https://trello-avatars.s3.amazonaws.com/95db28b493c6b5d2c39e85afd0701f79/30.png 1x, https://trello-avatars.s3.amazonaws.com/95db28b493c6b5d2c39e85afd0701f79/50.png 2x" alt="Barrett Cox (barrettcox1)" title="Barrett Cox (barrettcox1)"><span class="member-gold-badge" title="This member has Trello Gold."></span></div></div></div><p class="list-card-dropzone">Drop files to upload.</p><p class="list-card-dropzone-limited">Too many attachments.</p></a>
          //</div>
          //<p class="list-card-position quiet">in <strong>Archive</strong> on <strong>Spigit.com</strong></p>
        //</div>

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
      var cardsInList = $(thisTrellisto.cardContainerClass).filter(function() {
        var label = $(this).find('.list-card-position > strong:first-child').text(),
            formatted = thisTrellisto.formatName(label);

        return formatted == list;
      });
      return cardsInList;
    };

    // Returns an array with all cards in the list for the Board view
    this.getCardsInListByBoard = function (list) {
      var cardsInList = $(thisTrellisto.listClass).filter(function() {
        var listAttrVal = $(this).attr('data-trellisto-list-name');

        console.log('this:');
        console.log($(this));
        console.log('listAttrVal:');
        console.log(listAttrVal);
        //var label = $(this).find('.list-header .list-header-name').text(),
        //formatted = thisTrellisto.formatName(label);

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