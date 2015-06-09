/**************************************************
 *              Menus Directive                   *
 **************************************************/

angular.module('cosmo').directive('csMenu', ['Page', '$compile', function(Page, $compile) {
    return {
        templateUrl: 'core/html/partials/menu-links.html',
        replace: true,
        link: function(scope, elm, attrs, ctrl) {
            // Match the menu to the right location
            var updateMenus = function(){
                angular.forEach(Page.menus, function(data){
                    if(data.area === attrs.csMenu && data.menu)
                        scope.list = angular.fromJson(data.menu);
                });
            };
            updateMenus();

            scope.$on('menusGet', function(){
                updateMenus();
            });
        }
    };
}]);
