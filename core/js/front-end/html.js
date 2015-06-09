/**************************************************
 *              HTML Controller                   *
 *              Manage Meta-tags                  *
 **************************************************/

angular.module('cosmo').controller('HTMLCtrl', ['$scope', 'Page', 'Hooks', '$rootScope', 'Users', function($scope, Page, Hooks, $rootScope, Users){

    if(Users.admin)
        $scope.admin = true;

    // Update meta-tags
    var updateMetaTags = function(){
        var data = Hooks.HTMLHookNotify({title: Page.title, description: Page.description});
        $scope.title = data.title || Page.settings.site_name;
        $scope.description = data.description;
        $rootScope.$broadcast('HTMLCallback', {title: $scope.title, description: $scope.description});
    };
    updateMetaTags();

    $scope.$on('contentGet', function(){
        updateMetaTags();
    });

    // Check if the user is an administrator
    if(Users.role === 'admin')
        $scope.admin = true;

    // Watch for admin logins
    $scope.$on('adminLogin', function(data){
        $scope.admin = true;
        Users.admin = true;
    });
}]);
