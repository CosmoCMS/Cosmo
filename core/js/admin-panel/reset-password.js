/**************************************************
 *         Password Reset Controller              *
 **************************************************/

angular.module('cosmo').controller('resetPasswordCtrl', ['$routeParams', '$scope', 'REST', '$location', function($routeParams, $scope, REST, $location){

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
                $location.path('/');
            }, function(data){
                $rootScope.$broadcast('notify', {message: 'Invalid link'});
            });
        } else
            $rootScope.$broadcast('notify', {message: 'Passwords don\'t match'});
    };

}]);
