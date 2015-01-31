'use strict';

/**************************************************
 *        Handle all text and translations        *
 *           Manages all sidebar text             *
 **************************************************/

angular.module('cosmo.i18n', ['pascalprecht.translate'])

.config(function($translateProvider) {

    $translateProvider.useStaticFilesLoader({
        prefix: '/core/languages/',
        suffix: '.json'
    });

    // $translateProvider.useCookieStorage();
    $translateProvider.preferredLanguage('en');
});