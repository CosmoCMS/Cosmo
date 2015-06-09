/**************************************************
 *             Search Directive                   *
 *                HTML5 Audio                     *
 **************************************************/

angular.module('cosmo').directive('csSearch', function() {
    return {
        template: '<input type=text"" placeholder="Search..." ng-model="search">',
        controller: 'searchCtrl',
        link: function(scope, elm, attrs, ctrl) {

        }
    };
});
