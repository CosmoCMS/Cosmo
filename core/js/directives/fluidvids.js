/**************************************************
 *            Fluidvids Directive                 *
 *          Make videos responsive                *
 **************************************************/
 // Borrowed from http://toddmotto.com/creating-an-angularjs-directive-from-one-of-your-existing-plugins-scripts/

angular.module('cosmo').directive('fluidvids', ['$sce', function($sce){
    return {
        replace: true,
        scope: {},
        template: '<div class="fluidvids"><iframe ng-src="{{video}}"></iframe></div>',
        link: function (scope, element, attrs) {
            scope.video = $sce.trustAsResourceUrl(attrs.video);
            var ratio = (attrs.height / attrs.width) * 100;
            element[0].style.paddingTop = ratio + '%';
        }
    };
}]);
