/**************************************************
 *              Themes Controller                 *
 *              Edit the theme                    *
 **************************************************/

angular.module('cosmo').controller('themeCtrl', ['$scope', 'REST', '$http', function($scope, REST, $http){
    // Get all themes
    REST.themes.query({}, function(data){
        $scope.themes = data;
    });

    // Change the theme
    $scope.changeTheme = function(theme){
        REST.themes.update({ theme: theme }, function(){
            location.reload();
        });
    };

}]);
