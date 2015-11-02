/**************************************************
 *         Password Reset Controller              *
 **************************************************/

angular.module('cosmo').controller('resetPasswordCtrl', ['$routeParams', '$scope', 'REST', '$location', '$rootScope', '$translate', function($routeParams, $scope, REST, $location, $rootScope, $translate){

    $scope.reset = {};

    // Reset password
    $scope.reset = function(){
        if($scope.reset.password === $scope.reset.password2){
            REST.users.update({
                userID: $routeParams.userID,
                token: $routeParams.token,
                password: $scope.reset.password
            }, function(data){
                $translate('reset_password_updated').then(function(translatedText){
                    $rootScope.$broadcast('notify', {message: translatedText});
                });
                $scope.$parent.admin.showAdminPanel = false;
                $scope.$parent.admin.sidebar = 'core/html/sidebar.html';
                $location.path('/');
            }, function(data){
                $translate('reset_password_invalid').then(function(translatedText){
                    $rootScope.$broadcast('notify', {message: translatedText});
                });
            });
        } else {
            $translate('reset_password_match').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        }
    };

}]);
