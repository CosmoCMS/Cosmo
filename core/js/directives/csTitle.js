/**************************************************
 *              Title Directive                   *
 **************************************************/

angular.module('cosmo').directive('csTitle', ['Page', function(Page){
    return {
        link: function(scope, elm, attrs){
            elm.html('<a href="/">'+Page.settings.site_name+'</a>');
        }
    };
}]);
