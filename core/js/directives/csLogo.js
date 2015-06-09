/**************************************************
 *               Logo Directive                   *
 **************************************************/

angular.module('cosmo').directive('csLogo', ['Page', function(Page){
    return {
        template: '<a ng-href="/{{folder}}"><img class="logo--img" ng-src="{{url}}" /></a>',
        replace: true,
        link: function(scope, elm, attrs){
            scope.folder = Page.folder;
            scope.url = Page.settings.logo;
        }
    };
}]);
