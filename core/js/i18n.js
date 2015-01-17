'use strict';

/**************************************************
 *        Handle all text and translations        *
 *           Manages all sidebar text             *
 **************************************************/

angular.module('cosmo.i18n', ['pascalprecht.translate'])

.config(function ($translateProvider) {
    
    var englishTranslations = {
        // General text shared by multiple pages
        close: 'Close',

        // Blocks page text
        blocks_title: 'Edit Blocks',
        blocks_description: 'New Block',
        blocks_name: 'Name',
        blocks_add: 'add',
        blocks_editing: 'Editing'
    };
    
    $translateProvider.translations('en', englishTranslations);
  
    $translateProvider.preferredLanguage('en');
});