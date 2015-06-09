/**************************************************
 *        Create/Click an Anchor Link             *
 *                HTML5 Audio                     *
 **************************************************/

angular.module('cosmo').directive('csAnchor', ['$anchorScroll', '$location', function($anchorScroll, $location){
    return {
        link: function(scope, elm, attr){
            $anchorScroll();
            // Go to anchor
            elm.on('click', function(event){
                $location.hash(attr.anchor);
                $anchorScroll();
            });
        }
    };
}]);
