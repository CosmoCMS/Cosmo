/**************************************************
 *              Profile Controller                *
 *              Edit your profile                 *
 **************************************************/

angular.module('cosmo').controller('profileCtrl', ['$scope', 'REST', '$rootScope', 'Users', function($scope, REST, $rootScope, Users){

    // Initialize variables
    $scope.profile = {};
    $scope.profile.email = Users.email;

    // Get the User's profile photo
    REST.users.get({userID: Users.id}, function(data){
        Users.name = data.name;
        Users.bio = data.bio;
        Users.photo = data.photo;
        Users.role = data.role;
        Users.twitter = data.twitter;
        Users.facebook = data.facebook;
        Users.username = data.username;
        Users.email = data.email;
        $scope.profile = data;

        // Check if the photo was just selected from the media picker
        if($rootScope.tempSidebarPic && $rootScope.tempSidebarPic.id === 'profile') {
            $scope.profile.photo = $rootScope.tempSidebarPic.src;
            $rootScope.tempSidebarPic = null;
        } else if(!$scope.profile.photo)
            $scope.profile.photo = 'core/img/image.svg'; // Placeholder image
    });

    // Add a profile photo
    $scope.addProfilePhoto = function(){
        $rootScope.tempSidebarPic = {
            id: 'profile',
            src: $scope.profile,
            sidebar: 'core/html/profile.html'
        }
        $rootScope.$broadcast('editFiles', angular.toJson($rootScope.tempSidebarPic));
    };

    // Update the profile
    $scope.updateProfile = function(){
        REST.users.update({
            userID: Users.id,
            username: Users.username,
            name: $scope.profile.name,
            photo: $scope.profile.photo,
            bio: $scope.profile.bio,
            facebook: $scope.profile.facebook,
            twitter: $scope.profile.twitter,
            email: $scope.profile.email
        }, function(data){
            $rootScope.$broadcast('notify', { message: 'Profile info updated' });
            $scope.admin.photo = $scope.profile.photo;
        }, function(){
            $rootScope.$broadcast('notify', { message: 'There was an error updating your profile' });
        });
    };

}]);
