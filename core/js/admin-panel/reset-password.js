/**************************************************
 *         Password Reset Controller              *
 **************************************************/

angular.module('cosmo').controller('resetPasswordCtrl', ['$routeParams', '$scope', 'REST', '$location', '$rootScope', function($routeParams, $scope, REST, $location, $rootScope){

    $scope.reset = {};

    // Reset password
    $scope.reset = function(){
        if($scope.reset.password === $scope.reset.password2){
            REST.users.update({
                userID: $routeParams.userID,
                token: $routeParams.token,
                password: $scope.reset.password
            }, function(data){
                $rootScope.$broadcast('notify', {message: 'Password updated'});
                $scope.$parent.admin.showAdminPanel = false;
                $scope.$parent.admin.sidebar = 'core/html/sidebar.html';
                $location.path('/');
            }, function(data){
                $rootScope.$broadcast('notify', {message: 'Invalid link'});
            });
        } else
            $rootScope.$broadcast('notify', {message: 'Passwords don\'t match'});
    };

}]);
