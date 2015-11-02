/**************************************************
 *               Users Controller                 *
 *               Manage all users                 *
 **************************************************/

angular.module('cosmo').controller('usersCtrl', ['$scope', 'REST', '$rootScope', '$translate', function($scope, REST, $rootScope, $translate){

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
            $translate('users_updated').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        });
    };

    // Delete user
    $scope.delete = function(){
        // Delete user
        REST.users.delete({ userID: $scope.selectedUser.id }, function(){
            // Show success message
            $translate('users_deleted').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText});
            });
        }, function(){
            // Show error message
            $translate('users_delete_error').then(function(translatedText){
                $rootScope.$broadcast('notify', {message: translatedText, classes: 'alert-error'});
            });
        });
    };

}]);
