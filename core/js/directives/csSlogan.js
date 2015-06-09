/**************************************************
 *              Slogan Directive                  *
 **************************************************/

angular.module('cosmo').directive('csSlogan', ['Page', function(Page){
    return {
        link: function(scope, elm, attrs){
            elm.html(Page.settings.slogan);
        }
    };
}]);
