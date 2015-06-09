/**************************************************
 *          Search Results Directive              *
 **************************************************/

angular.module('cosmo').directive('csResults', ['Page', function(Page) {
    return {
        templateUrl: 'core/html/partials/results.html',
        link: function(scope, elm, attrs, ctrl) {
            scope.results = Page.results;
        }
    };
}]);
