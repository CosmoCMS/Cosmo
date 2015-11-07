/**************************************************
 *              URL Controller                    *
 *      Get the current page information          *
 **************************************************/

angular.module('cosmo').controller('urlCtrl', ['$scope', 'Page', '$rootScope', 'REST', '$location', 'Users', '$filter', function($scope, Page, $rootScope, REST, $location, Users, $filter){

    // Reset variables while new page loads
    $scope.page = {};
    Page.title = '';
    Page.description = '';
    Page.header = '';
    Page.subheader = '';
    Page.body = '';
    Page.url = '';
    Page.tags = [];
    Page.type = '';
    Page.publish = '';
    Page.scheduleDate = '';
    Page.timestamp = '';
    Page.extras = {};

    // Get content
    REST.content.get({ url: $location.path() }, function(data, headers){

        // Check if the site is under maintenence
        if(Page.settings){
            if(parseInt(Page.settings.maintenance_mode) === 1 && Page.settings.maintenance_url && !Users.admin && $location.path() !== '/error'){
                Page.menus = []; // Don't show menus, since those pages are disabled
                $location.path(Page.settings.maintenance_url).replace();
                if(data.redirect) // Don't double redirect if this is a redirected URL
                    return false;
            }
        }

        // If the URL has changed, redirect the user to the new URL
        if(data.redirect){
            $location.path(data.redirect).replace();
            return false;
        }

        Page.id = data.id;
        Page.author = data.author;
        $scope.page.author = data.author;
        Page.title = data.title;
        Page.description = data.description;
        Page.header = data.header;
        Page.subheader = data.subheader;
        Page.body = data.body;
        Page.url = data.url;
        if(data.tags)
            Page.tags = data.tags;
        else
            Page.tags = [];
        $scope.page.tags = Page.tags;
        if(data.type)
            Page.type = data.type;
        else
            Page.type = Page.themePages[0];
        Page.publish = data.published;
        Page.scheduleDate = data.published_date;
        $scope.page.published_date = data.published_date * 1000; // Convert unix timestamp to milliseconds
        Page.timestamp = data.timestamp;
        $scope.page.current_year = new Date().getFullYear();
        if(data.extras)
            Page.extras = data.extras;
        else
            Page.extras = {};

        if(Page.theme)
            $scope.template = 'themes/' + Page.theme + '/' + Page.type;

        $rootScope.$broadcast('contentGet', data);

        // Get blocks
        REST.blocks.query({ type: Page.type, url: $location.path() }, function(data){
            Page.blocks = data;
            $rootScope.$broadcast('blocksGet', data);
        });

        // Get comments for this page
        REST.comments.query({ id: Page.id }, function(data){
            // Parse comment from JSON
            angular.forEach(data, function(comment){
                comment.path = angular.fromJson(comment.path);
            });
            $scope.page.comments = $filter('orderBy')(data, function(comment){ return comment.path; });
            Page.comments = $scope.page.comments;
            $scope.page.commentsNum = $scope.page.comments.length;
            $rootScope.$broadcast('commentsGet', {comments: $scope.page.comments});
        });

    }, function(data){ // Page not found
        $location.path('error').replace();
    });

    // Update the theme if it's been changed
    var changeTheme = function(){
        if($scope.template !== 'themes/' + Page.theme + '/' + Page.type && Page.theme && Page.type)
            $scope.template = 'themes/' + Page.theme + '/' + Page.type;
    };
    changeTheme();

    // Update the theme
    $scope.$on('settingsGet', function(data){
        changeTheme();
    });

    // Update the theme
    $scope.$on('contentGet', function(data){
        changeTheme();
    });

    // Watch for shortcut keypresses
    if(Users.admin){
        angular.element(document).on('keydown', function(event){
            // Switch from edit to view mode (if applicable)
            if(event.keyCode === 91 && event.shiftKey)
                $rootScope.$broadcast('switchViewMode');
        });
    }

    // Callback for the page loading
    $rootScope.$broadcast('pageLoaded', { url: $location.path() });
}]);
