/**************************************************
 *      Login / Registration Controller           *
 **************************************************/

angular.module('cosmo').controller('loginRegistrationCtrl', ['$scope', 'REST', '$http', '$location', '$rootScope', 'Users', 'Page', '$timeout', function($scope, REST, $http, $location, $rootScope, Users, Page, $timeout){

    // Initialize panel to show
    $scope.login = {
        panel: 'login'
    };
    $scope.register = {};
    $scope.register.email = '';

    // Create account
    $scope.register = function(){
        if($scope.register.password === $scope.register.confirmPassword){
            REST.users.save({
                username: $scope.register.username,
                email: $scope.register.email,
                password: $scope.register.password
            }, function(data){ // Success
                $rootScope.$broadcast('notify', {message: 'Account created'});
                $location.path('/');
            }, function(){ // Error
                $rootScope.$broadcast('notify', {message: 'Username/email is already in use'});
            });
        } else {
            $rootScope.$broadcast('notify', { message: 'Passwords don\'t match' });
        }
        $rootScope.$broadcast('registered', { username: $scope.register.username, email: $scope.register.email });
    };

    // Login
    $scope.userLogin = function(){
        REST.users.get({ username: $scope.login.username, password: $scope.login.password, dontcache: new Date().getTime() }, function(data){

            // Set Users variables
            Users.name = data.name;
            Users.bio = data.bio;
            Users.photo = data.photo;
            Users.role = data.role;
            Users.twitter = data.twitter;
            Users.facebook = data.facebook;
            Users.username = data.username;
            Users.email = data.email;

            // Set cookie and headers with username and auth token
            var expdate = new Date();
            expdate.setDate(expdate.getDate() + 90); // 90 days in the future
            document.cookie= "usersID=" + data.id + ";expires=" + expdate.toGMTString();
            document.cookie= "username=" + $scope.login.username.toLowerCase() + ";expires=" + expdate.toGMTString();
            document.cookie= "token=" + data.token + ";expires=" + expdate.toGMTString();
            document.cookie= "role=" + data.role + ";expires=" + expdate.toGMTString();

            $http.defaults.headers.common['username'] = $scope.login.username.toLowerCase();
            $http.defaults.headers.common['token'] = data.token;
            $http.defaults.headers.common['usersID'] = data.id;

            Users.id = data.id;
            Users.username = $scope.login.username.toLowerCase();
            Users.role = data.role;

            // Check if the user is an administrator
            if(data.role === 'admin'){
                $rootScope.$broadcast('adminLogin');
                Users.roleNum = 1;
            }

            $scope.login.username = '';
            $scope.login.password = '';
            $location.path('/');

            $rootScope.$broadcast('loggedIn');
        }, function(){
            $rootScope.$broadcast('notify', { message: 'Wrong Username/Password' });
        });
    };

    // Log the user out
    $scope.logout = function(){
        // Delete cookies
        document.cookie = 'username=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'usersID=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'token=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        Users.id = '';
        Users.username = '';
        $http.defaults.headers.common['username'] = '';
        $http.defaults.headers.common['token'] = '';
        $http.defaults.headers.common['usersID'] = '';
        $location.path('/');
        $timeout(function(){
            location.reload();
        }, 1000);
    };

    // Reset password
    $scope.resetPassword = function(){
        if($scope.login.username){
            REST.users.update({ username: $scope.login.username, reset: true }, function(data){
                $rootScope.$broadcast('notify', {message: 'Check your password reset for instructions'});
            });
        } else
            $rootScope.$broadcast('notify', { message: 'Error: You must enter your username to reset your password' });
    };

    // Change Username
    $scope.changeUsername = function(){
        REST.users.update({ userID: Users.id, username: $scope.username }, function(){
            $rootScope.$broadcast('notify', {message: 'Username updated'});
        });
    };

    // Change email address
    $scope.changeEmail = function(){
        REST.users.update({ userID: Users.id, email: $scope.email }, function(data){
            $rootScope.$broadcast('notify', {message: 'Email updated'});
        });
    };

    // Change password
    $scope.changePassword = function(){
        REST.users.update({ userID: Users.id, password: $scope.password }, function(){
            $rootScope.$broadcast('notify', {message: 'Password updated'});
        });
    };

    // Delete account
    $scope.deleteAccount = function(){
        REST.users.delete({ userID: Users.id }, function(data){
            // Clear variables and return to the home page
            Users.id = '';
            Users.username = '';
            $http.defaults.headers.common['username'] = '';
            $http.defaults.headers.common['token'] = '';
            $http.defaults.headers.common['usersID'] = '';
            $location.path('/');
        });
    };

}]);
