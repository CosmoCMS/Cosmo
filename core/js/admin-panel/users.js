/**************************************************
 *               Users Controller                 *
 *               Manage all users                 *
 **************************************************/

angular.module('cosmo').controller('usersCtrl', ['$scope', 'REST', '$rootScope', function($scope, REST, $rootScope){

    // Initialize variables
    $scope.users = {};

    // Get users
    REST.users.query({}, function(data){
        $scope.users.data = data;
    });

    // Update the user's info
    $scope.updateUser = function(user){
        REST.users.update({
            userID: user.id,
            username: user.username,
            photo: user.photo,
            facebook: user.facebook,
            twitter: user.twitter,
            role: user.role,
            email: user.email
        }, function(data){
            $rootScope.$broadcast('notify', {message: 'User info updated'});
        });
    };

    // Delete user
    $scope.delete = function(){
        // Delete user
        REST.users.delete({ userID: $scope.selectedUser.id }, function(){
            // Show success message
            $rootScope.$broadcast('notify', {message: 'User deleted'});
        }, function(){
            // Show error message
            $rootScope.$broadcast('notify', {message: 'Error deleting user', classes: 'alert-error'});
        });
    };

}]);
