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
                alert('Password updated');
                $location.path('/');
            }, function(data){
                alert('Invalid link');
            });
        } else
            alert("Passwords don't match");
    };

}]);
