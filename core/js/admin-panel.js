'use strict';
angular.module('cosmo.admin', [])

/**************************************************
 *             Admin Panel Controller             *
 *           Control the admin sidebar            *
 **************************************************/

.controller('adminPanelCtrl', ['$scope', 'Users', 'REST', '$location', '$timeout', '$http', '$sce', function($scope, Users, REST, $location, $timeout, $http, $sce){

    $scope.admin = {};
    $scope.admin.sidebar = 'core/html/sidebar.html';
    $scope.admin.username = Users.username;
    $scope.admin.roleNum = Users.roleNum;
    
    // Get latest official message from Cosmo (for version, updates, and blog posts)
    $http.get('http://www.cosmocms.org/message.php?dontcache='+ new Date().getTime())
    .success(officialMessagePromise);
    
    // Update official message from Cosmo
    function officialMessagePromise(data){
        if(data){
            data = angular.fromJson(data);
            $scope.admin.messageID = data.id;
            var dontShowCookie = document.cookie.substr(document.cookie.indexOf('dontShowMessage=')+16, 5);
            if($scope.admin.messageID !== dontShowCookie){
                $scope.admin.message = $sce.trustAsHtml(data.message);
                $scope.admin.displayMessage = true;
            }
        }
    };
    
    // Set a cookie so you don't see this message any more
    $scope.removeMessage = function(){
        var expdate = new Date();
        expdate.setDate(expdate.getDate() + 90); // 90 days in the future
        document.cookie = "dontShowMessage=" + $scope.admin.messageID + ";expires=" + expdate.toGMTString();
        $scope.admin.displayMessage = false;
    };
    
    // Get user's info
    REST.users.get({userID: Users.id}, usersInfoPromise);
    
    // Update user's info in the template
    function usersInfoPromise(data){
        Users.name = data.name;
        Users.bio = data.bio;
        Users.photo = data.photo;
        Users.role = data.role;
        Users.twitter = data.twitter;
        Users.facebook = data.facebook;
        Users.username = data.username;
        Users.email = data.email;
        
        if(data.photo)
            $scope.admin.photo = data.photo;
        else
            $scope.admin.photo = 'core/img/image.svg';
    };
    
    $scope.sidebar = '';
    $scope.showAdminPanel = false; // Initialize sidebar as hidden
    
    // Go to the new page
    $scope.navigate = function(){
        $location.path('new');
    };
    
    // todo: Depreciate. Remove from admin-panel.html and use loginRegistrationCtrl instead
    $scope.logout = function(){
        // Delete cookies
        document.cookie = 'username=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'usersID=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'token=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        Users.id = '';
        Users.username = '';
        $http.defaults.headers.common['username'] = '';
        $http.defaults.headers.common['token'] = '';
        $location.path('/');
        $timeout(function(){
            location.reload();
        }, 1000);
    };
}])

/**************************************************
 *             Block Controller                   *
 *       Manage the sidebar block editor          *
 **************************************************/

.controller('blockCtrl', ['$scope', 'REST', 'Page', '$rootScope', function($scope, REST, Page, $rootScope){
    
    $scope.block = {};
    $scope.block.panel = 'manage';
    $scope.types = [];
    $scope.block.selectedTypes = {};
    
    // Get all available blocks
    REST.blocks.query({}, function(data){
        $scope.blocks = data;
    });
    
    // Get the page types availabl
    $scope.types = Page.themePages;

    $scope.$on('wysiwygEdit', function(event, data){
        $scope.block.html = data.html;
    });

    // Select a block
    $scope.selectBlock = function(block){
        $scope.block.id = block.id;
        $scope.block.name = block.name;
        $scope.block.panel = 'edit';
        $scope.block.html = block.block;
        $scope.block.area = block.area;

        if(block.priority)
            $scope.block.priority = block.priority;
        else
            $scope.block.priority = 0;

        Page.extras.none = $scope.block.html;
        $rootScope.$broadcast('contentGet');

        // Get the block requirements
        REST.blocksRequirements.query({ blockID: $scope.block.id }, blockRequirementsPromise);
    };
    
    // Update block requirements
    function blockRequirementsPromise(data){
        var blockURLs = '';
        angular.forEach(data, function(data2){
            if(data2.type === 'visible' || data2.type === 'invisible'){
                $scope.block.visibility = data2.type;
                blockURLs += data2.requirement + "\n";
            } else {
                if(data2.type)
                    $scope.block.selectedTypes[data2.requirement] = true;
            }
        });
        $scope.block.urls = blockURLs;
    }

    // Add a new block
    $scope.newBlock = function(){
        REST.blocks.save({ name: $scope.block.newName }, newBlockPromise);
    };
    
    // Update info from the new block
    function newBlockPromise(data){
        if($scope.blocks)
            $scope.blocks.push({ id: data.data, name: $scope.block.newName });
        else
            $scope.blocks = [{ id: data.data, name: $scope.block.newName }];

        $scope.block.newName = '';
        $rootScope.$broadcast('notify', {message: 'New block added'});
    }

    // Delete block
    $scope.deleteBlock = function(){
        REST.blocks.delete({ blockID: $scope.block.id }, deleteBlockPromise);
    };
    
    // Update block after being deleted
    function deleteBlockPromise(data){
        if(data){
            for(var i=0; i< $scope.blocks.length; i++){
                if($scope.blocks[i]['id'] === $scope.block.id)
                    $scope.blocks.splice(i,1);
            }
            $scope.block.name = '';
            $rootScope.$broadcast('notify', {message: 'Block deleted'});
        }
    }
    
    // Update block section/priority from the overview section
    $scope.updateBlock = function(block){
        REST.blocks.update({
            blockID: block.id,
            name: block.name,
            block: block.block,
            area: block.area,
            priority: parseInt(block.priority)
        }, function(data){
            $rootScope.$broadcast('notify', {message: 'Block updated'});
        });
    };
    
    // Save the addition/edits to the block
    $scope.saveBlock = function(){
        // Save block to database
        REST.blocks.update({
            blockID: $scope.block.id,
            name: $scope.block.name,
            block: $scope.block.html,
            area: $scope.block.area,
            priority: $scope.block.priority
        }, saveBlockPromise);
    };
    
    // Update page after saving a block
    function saveBlockPromise(data){
            
        // Update block name in CMS
        for(var i=0; i< $scope.blocks.length; i++){
            if($scope.blocks[i]['id'] === $scope.block.id)
                $scope.blocks[i]['name'] = $scope.block.name;
        }

        // Delete old visibility requirements
        REST.blocksRequirements.delete({ blockID: $scope.block.id }, blocksRequirementsDeletePromise);

        // Notify the user of the updated block
        $rootScope.$broadcast('notify', {message: 'Block updated'});
    };
    
    // Update visibility requirements
    function blocksRequirementsDeletePromise(){
        // Save block visibility requirements
        if($scope.block.visibility){
            var urls = $scope.block.urls.split("\n");
            for(var i=0; i<urls.length; i++){
                REST.blocksRequirements.save({
                    blockID: $scope.block.id,
                    type: $scope.block.visibility,
                    requirement: urls[i]
                });
            }
        }

        // Save block page type requirements
        angular.forEach($scope.block.selectedTypes, function(value, key){
            if($scope.block.selectedTypes[key]){
                REST.blocksRequirements.save({
                    blockID: $scope.block.id,
                    type: 'type',
                    requirement: key
                }, fetchUpdatedBlocks);
            }
        });
        fetchUpdatedBlocks();
    }
    
    // Get new updated blocks
    function fetchUpdatedBlocks(){
        REST.blocks.query({ type: Page.type, url: Page.url }, function(data){
            Page.blocks = data;
            $rootScope.$broadcast('blocksGet', data);
        });
    }
}])

/**************************************************
 *          Content List Controller               *
 *             Search content                     *
 **************************************************/

.controller('contentListCtrl', ['$scope', 'REST', 'Hooks', 'Responsive', function($scope, REST, Hooks, Responsive){
    
    $scope.search = {};
    $scope.exclude = {};
    $scope.exclude.tags = '!exclude';
    $scope.content = {};
    $scope.content.onlySearch = 'all';

    // Search
    $scope.searchBar = function(){
        $scope.search = {};
        switch($scope.content.onlySearch){
            case 'type': // Search only the page type
                $scope.search.type = $scope.content.input;
                break;
            case 'author': // Search only the author
                $scope.search.author = $scope.content.input;
                break;
            case 'tags': // Search only the tags
                $scope.search.tags = $scope.content.input;
                break;

            default: // Search anywhere
                $scope.search = $scope.content.input;
                break;
        }
    };
    
    // Fetch content
    REST.content.query({}, fetchContentPromise);
    
    // Update the content after it's called
    function fetchContentPromise(data){
        angular.forEach(data, function(data2){
            data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'small'));
        });
        $scope.pages = data;
    }
}])

/**************************************************
 *              Menu Controller                   *
 *     Manage admin sidebar menu editor           *
 **************************************************/

.controller('menuCtrl', ['$scope', 'REST', '$rootScope', 'Page', function($scope, REST, $rootScope, Page){

    $scope.menu = {};
    $scope.menu.panel = 'manage';
    $scope.menu.editLink = true;

    // Get all available menus
    REST.menus.query({}, function(data){
        $scope.menus = data;
    });
    
    $scope.remove = function(scope) {
        if($scope.list.length>1){
            var index = scope.$index;
            if (index > -1) {
                scope.sortableModelValue.splice(index, 1)[0];
            }
        } else
            alert("You cannot have an empty menu");
    };
    
    $scope.newSubItem = function(scope) {
        var nodeData = scope.$modelValue;
        nodeData.items.push({
            id: nodeData.id * 10 + nodeData.items.length,
            title: nodeData.title + '.' + (nodeData.items.length + 1),
            url: '',
            items: []
        });
    };
    
    // Select a menu
    $scope.selectMenu = function(menu){
        $scope.menu.id = menu.id;
        $scope.menu.name = menu.name;
        $scope.menu.area = menu.area;
        $scope.menu.panel = 'edit';

        if(menu.menu)
            $scope.list = angular.fromJson(menu.menu);
        else
            $scope.list = [{
                "id": 1,
                "title": "Link",
                "url": "",
                "items": []
              }];
    };

    $scope.options = {
        itemClicked: function(sourceItem){
            $scope.menu.editLinkText = sourceItem.title;
            $scope.menu.editLinkURL = sourceItem.url;
            $scope.menu.selectedLink = sourceItem;
            $scope.$apply();
        }
    };

    // Add a new menu
    $scope.newMenu = function(){
        REST.menus.save({ name: $scope.menu.newName }, function(data){
            if($scope.menus)
                $scope.menus.push({ id: data, name: $scope.menu.newName });
            else
                $scope.menus = [{ id: data, name: $scope.menu.newName }];

            $scope.menu.newName = '';
            $rootScope.$broadcast('notify', {message: 'Menu created'});
        });
    };

    // Edit a menu's name
    $scope.updateMenuName = function(){
        REST.menus.update({ 
            menuID: $scope.menu.id, 
            name: $scope.menu.name, 
            menu: $scope.menu.menu, 
            area: $scope.menu.area 
        }, updateMenuPromise);
    };
    
    // Update the menu after it's called
    function updateMenuPromise(data){
        if(data){
            for(var i=0; i< $scope.menus.length; i++){
                if($scope.menus[i]['id'] === $scope.menu.id)
                    $scope.menus[i]['name'] = $scope.menu.name;
            }
            $scope.menu.name = '';
        }
    }

    // Delete menu
    $scope.deleteMenu = function(){
        REST.menus.delete({ menuID: $scope.menu.id }, deleteMenuPromise);
    };

    // Update the page after a menu was deleted
    function deleteMenuPromise(data){
        if(data){
            for(var i=0; i< $scope.menus.length; i++){
                if($scope.menus[i]['id'] === $scope.menu.id)
                    $scope.menus.splice(i,1);
            }
            $scope.menu.name = '';
            $rootScope.$broadcast('notify', {message: 'Menu deleted'});
        }
    }

    // Update link
    $scope.updateLink = function(){
        angular.forEach($scope.list, function(link){
            if(angular.equals(link, $scope.menu.currentlyEditingLink)){
                link.title = $scope.menu.editLinkText;
                link.url = $scope.menu.editLinkURL;
            }
            // Iterate through sub-menu links
            angular.forEach(link.items, function(link2){
                if(angular.equals(link2, $scope.menu.currentlyEditingLink)){
                    link2.title = $scope.menu.editLinkText;
                    link2.url = $scope.menu.editLinkURL;
                }
                // Iterate through sub-sub-menu links
                angular.forEach(link2.items, function(link3){
                    if(angular.equals(link3, $scope.menu.currentlyEditingLink)){
                        link3.title = $scope.menu.editLinkText;
                        link3.url = $scope.menu.editLinkURL;
                    }
                });
            });
        });
    };

    // Save the addition/edits to the menu
    $scope.saveMenu = function(){
        // Save menu
        REST.menus.update({ 
            menuID: $scope.menu.id, 
            name: $scope.menu.name, 
            menu: angular.toJson($scope.list), 
            area: $scope.menu.area 
        }, saveMenuPromise);
    };
    
    // Update page after saving the menu
    function saveMenuPromise(data){
        // Re-fetch menus to update the site live
        REST.menus.query({}, function(data){
            Page.menus = data;
            $rootScope.$broadcast('menusGet');
        });
        // Notify the user the menu has been updated
        $rootScope.$broadcast('notify', {message: 'Menu saved'});
    }
}])

/**************************************************
 *              Module Controller                 *
 *      Manage the admin sidebar modules          *
 **************************************************/

.controller('moduleCtrl', ['$scope', 'REST', '$rootScope', '$http', function($scope, REST, $rootScope, $http){

    // Get modules
    REST.modules.query({}, function(data){
        $scope.modules = data;
    });

    // Install Module
    $scope.install = function(module, index){
        $scope.currentIndex = index;
        REST.modules.save({ module: module }, installModulePromise);
    };

    // Update the page after installing a new module
    function installModulePromise(data){
        $scope.modules[$scope.currentIndex]['status'] = 'active';

        // Check for an installation file and run it
        if($scope.modules[$scope.currentIndex]['install'])
            $http.get('modules/'+ $scope.modules[$scope.currentIndex]['folder'] +'/'+ $scope.modules[$scope.currentIndex]['install']);

        // Success Message
        $rootScope.$broadcast('notify', { message: 'Module installed' });
    }

    // Uninstall Module
    $scope.uninstall = function(moduleID, index){
        $scope.currentIndex = index;
        REST.modules.delete({ moduleID: moduleID }, uninstallModulePromise);
    };
    
    // Update the page after uninstalling a module
    function uninstallModulePromise(data){
        // Check for an uninstallation file and run it
        if($scope.modules[$scope.currentIndex]['uninstall'])
            $http.get('modules/'+ $scope.modules[$scope.currentIndex]['folder'] +'/'+ $scope.modules[$scope.currentIndex]['uninstall']);

        // Remove module from sidebar
        $scope.modules[$scope.currentIndex] = null;

        // Success Message
        $rootScope.$broadcast('notify', {message: 'Module uninstalled'});
    }
    
    // Activate Module
    $scope.activate = function(moduleID, index){
        $scope.currentIndex = index;
        REST.modules.update({ moduleID: moduleID, status: 'active' }, activateModulePromise);
    };
    
    // Update the page after activating a module
    function activateModulePromise(data){
        $scope.modules[$scope.currentIndex]['status'] = 'active';

        // Success Message
        $rootScope.$broadcast('notify', {message: 'Module activated'});
    }

    // Deactivate Module
    $scope.deactivate = function(moduleID, index){
        $scope.currentIndex = index;
        REST.modules.update({ moduleID: moduleID, status: 'inactive' }, deactivateModulePromise);
    };
    
    // Update the page after deactivating a module
    function deactivateModulePromise(data){
        $scope.modules[$scope.currentIndex]['status'] = 'inactive';

        // Success Message
        $rootScope.$broadcast('notify', {message: 'Module deactivated'});
    }

    // Go to a module's settings
    $scope.goToSettings = function(folder, file){
        $scope.settingsFile = 'modules/'+ folder +'/'+ file;
    };

}])

/**************************************************
 *              Page Controller                   *
 *      Make new pages and edit old pages.        *
 **************************************************/

.controller('pageCtrl', ['$scope', 'REST', '$location', 'Page', '$rootScope', '$routeParams', '$upload', 'Users', function($scope, REST, $location, Page, $rootScope, $routeParams, $upload, Users){
    
    // Initialize variables
    $scope.page = {
        id: Page.id,
        title: Page.title,
        description: Page.description,
        url: Page.url,
        publish: Page.publish,
        scheduleDate: Page.scheduleDate,
        tags: Page.tags,
        type: Page.type,
        themePages: []
    };
    
    // Set the date to today if no date was set
    if(!$scope.page.scheduleDate || $location.path() === '/new')
        $scope.page.scheduleDate = new Date(); // Math.round(+new Date().getTime()/1000); Depreciate?
    
    // Initialize schedule date - Depreciate?
    var date = new Date($scope.page.scheduleDate * 1000);
    var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    var ampm = date.getHours() > 12 ? 'PM' : 'AM';
    var formattedDate = date.getMonth() + 1 +'/'+ date.getDate() +'/'+ date.getFullYear() +' '+ hours +':'+ date.getMinutes() +' '+ ampm;
    // $scope.page.scheduleDate = formattedDate;
    
    // Get the pages available to this theme
    $scope.page.themePages = Page.themePages;
    
    // Initialize the page type
    if(Page.type)
        $scope.page.type = Page.type;
    else
        $scope.page.type = $scope.page.themePages[0];
    
    // todo: Save Page.extras save locally too
    
    // Check if there's an unsaved version from a previous session
    var elements = ['title', 'description', 'publish', 'scheduleDate', 'header', 'subheader', 'body', 'url'];
    if($location.path() !== '/new'){ // Don't apply this to new pages
        angular.forEach(elements, function(value){
            if(localStorage.getItem($routeParams.url + value) !== Page[value] && localStorage.getItem($routeParams.url + value) !== 'null')
                $scope.newerVersion = true;
        });
    }

    // Revert to the previously saved version
    $scope.localVersion = function(){

        var elements = ['title', 'description', 'publish', 'scheduleDate', 'header', 'subheader', 'body', 'url'];
        angular.forEach(elements, function(value){
            // Restore item
            if(localStorage.getItem($routeParams.url + value) !== 'null')
                Page[value] = localStorage.getItem($routeParams.url + value);

            // Clear item from storage
            localStorage.setItem($routeParams.url + value, null);
        });

        $scope.newerVersion = false;
        $rootScope.$broadcast('contentGet');
    };

    // Delete newer version
    $scope.deleteNewerVersion = function(){
        var elements = ['title', 'description', 'publish', 'scheduleDate', 'header', 'subheader', 'body', 'url'];
        angular.forEach(elements, function(value){
            localStorage.setItem($routeParams.url + value, null);
        });

        $scope.newerVersion = false;
    };

    // Delete the page
    $scope.deletePage = function(){
        // Delete the page
        REST.content.delete({ contentID: $scope.page.id }, function(data){
            // Success message
            $rootScope.$broadcast('notify', {message: 'Deleted'});
        });

        // Delete all revisions of this page
        REST.contentRevisions.delete({ contentID: $scope.page.id });

        // Delte all extra revisions
        REST.contentRevisionsExtras.delete({ contentID: $scope.page.id });

        // Delete all extras from this page
        REST.contentExtras.delete({ contentID: $scope.page.id });

        // Delete all tags for this page
        REST.contentTags.delete({ contentID: $scope.page.id });

        // Redirect to the default new page
        $location.path('new');
    };

    // Watch for page change
    var updatePage = function() {
        $scope.page.title = Page.title;
        $scope.page.description = Page.description;
        $scope.page.url = Page.url;
        $scope.page.type = Page.type;
        $scope.page.tags = Page.tags;
    };
    updatePage();

    $scope.$on('contentGet', function(){
        updatePage();
    });

    // Update the page type
    $scope.updatePageType = function(){
        Page.type = $scope.page.type;
        $rootScope.$broadcast('settingsGet');
    };

    // Auto-generate the url from the title
    $scope.titleChange = function(){

        // Log changes to the Page object
        Page.title = $scope.page.title;
        
        // Only auto-generate urls for new pages
        if($scope.page.url === '/new' || $scope.page.url === 'new' || !$scope.page.url)
            $scope.autoURL = true;

        if($scope.autoURL){
            // Change spaces to hyphens, convert to lowercase, and remove punctuation
            $scope.page.url = $scope.page.title.toLowerCase().replace(/ /g, '-').replace(/[\.,\/#!$%\^&\*;:{}=_'~()\?]/g, '');
            Page.url = $scope.page.url;
        }
    };

    // Save changes to the description
    $scope.descriptionChange = function(){
        Page.description = $scope.page.description;
    };

    // Save changes to the url
    $scope.urlChange = function(){
        Page.url = $scope.page.url;
    };

    // Update page variables when they are changed
    $scope.saveLocal = function(){
        Page.title = $scope.page.title;
        Page.description = $scope.page.description;
        Page.url = $scope.page.url;
        Page.type = $scope.page.type;

        // Save to local Storage
        localStorage.setItem($routeParams.url + 'title', Page.title);
        localStorage.setItem($routeParams.url + 'description', Page.description);
        localStorage.setItem($routeParams.url + 'url', Page.url);
        localStorage.setItem($routeParams.url + 'publish', Page.publish);
        localStorage.setItem($routeParams.url + 'scheduleDate', Page.scheduleDate);
        localStorage.setItem($routeParams.url + 'type', Page.type);
    };

    // Autocomplete tags
    $scope.autocompleteTags = function(){
        var tag = $scope.page.tags[$scope.page.tags.length - 1];
        if(tag){
            REST.filesTags.query({ tag: tag }, function(data){
                $scope.page.suggestions = data;
            }, function(){ // no tag found
                $scope.page.suggestions = [];
            });
        } else
            $scope.page.suggestions = [];
    };
    
    // Select tag from autocomplete
    $scope.selectSuggestion = function(tag){
        var tags = angular.copy($scope.page.tags);
        tags[tags.length - 1] = tag;
        tags[tags.length] = '';
        $scope.page.tags = tags;
        $scope.page.suggestions = [];
    };
    
    // Save the page
    $scope.savePage = function(duplicate){
        
        // Check for duplicate URL
        if(duplicate && $scope.page.url === $location.path()){
            $rootScope.$broadcast('notify', {message: 'Error: URL must be different to duplicate a page', classes: 'alert-error'});
            return;
        }
        
        // Make sure there is a page type
        if(!$scope.page.type){
            $rootScope.$broadcast('notify', {message: 'No page type selected', classes: 'alert-error'});
            return;
        }
        
        // If there's no custom title tag, use the header
        if($scope.page.title){
            if($scope.page.title.length === 0)
                $scope.page.title = Page.header;
        }
        
        // If there's no custom url, throw an error
        if($scope.page.url.length === 0 || $scope.page.url === 'new'){
            $rootScope.$broadcast('notify', { message: 'No URL Input', classes: 'alert-error' });
            return;
        }
        
        // Get the scheduled date to publish
        var scheduleDate;
        if($scope.page.publish === 'Y' && Page.publish === 'Y') // If this was already published, don't update the published date
            scheduleDate = Page.scheduleDate;
        else if($scope.page.publish === 'Y') // If publishing now, set the publish date to the current time
            scheduleDate = Math.round(+new Date().getTime()/1000);
        else if($scope.page.publish === 'schedule'){
            scheduleDate = Date.parse($scope.page.scheduleDate).getTime()/1000;
            // Check if this is back dated
            if(Date.parse($scope.page.scheduleDate).getTime() < Math.round(+new Date().getTime()))
                $scope.page.publish = 'Y';
            else
                $scope.page.publish = 'N';
        }
        
        // Get the featured image URL
        if(Page.extras.featured)
            var featured = Page.extras.featured.src;
        else
            var featured = null;
        
        // Create a new page or a duplicate
        if($location.path() === '/new' || duplicate){
            // Save content
            REST.content.save({
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header,
                subheader: Page.subheader,
                featured: featured,
                body: Page.body,
                url: $scope.page.url,
                type: $scope.page.type,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: Users.id
            }, newPagePromise, function(){ // Error
                $rootScope.$broadcast('notify', {message: 'Error saving page. Possible duplicate URL', classes: 'alert-error'});
            });
        } else { // Update existing page

            var revisionID;

            // Update the page
            REST.content.update({
                contentID: $scope.page.id,
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header,
                subheader: Page.subheader,
                featured: featured,
                body: Page.body,
                url: $scope.page.url,
                type: $scope.page.type,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: Users.id
            }, updatePagePromise, function(data){ // Error
                $rootScope.$broadcast('notify', {message: 'Error updating page', classes: 'alert-error'});
            });
        }
        
        // Update the page after a new page was saved
        function newPagePromise(data){
            var contentID = data.id;

            // Reset variables to edit page
            $scope.page.id = contentID;
            $scope.autoURL = false;

            // Save new tags
            if($scope.page.tags){
                angular.forEach($scope.page.tags, function(value){
                    REST.contentTags.save({ contentID: contentID, tag: value });
                });
            }

            // Save page as a revision
            REST.contentRevisions.save({
                contentID: contentID,
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header,
                subheader: Page.subheader,
                featured: featured,
                body: Page.body,
                url: $scope.page.url,
                type: $scope.page.type,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: Users.id
            }, saveRevisionPromise);
        }
            
        // Update the page after saving a page revision
        function saveRevisionPromise(data){
            revisionID = data.id;
            var i = 1;

            // Save additional data if there is any
            if(Object.keys(Page.extras).length === 0){
                // Success message
                $rootScope.$broadcast('notify', {message: 'Saved'});
                // Redirect to new page
                $location.path($scope.page.url);
            } else {
                for(var key in Page.extras){
                    // Stringify arrays and objects
                    if(typeof Page.extras[key] === 'object')
                        Page.extras[key] = angular.toJson(Page.extras[key]);

                    // Save extra
                    REST.contentExtras.save({
                        contentID: contentID,
                        name: key,
                        extra: Page.extras[key]
                    }, saveExtrasPromise, saveExtrasPromise);

                    // Save extra to revisions
                    REST.contentRevisionsExtras.save({
                        revisionID: revisionID,
                        contentID: contentID,
                        name: key,
                        extra: Page.extras[key]
                    });
                };
            }
            $rootScope.$broadcast('notify', {message: 'Page Created'});
        }

        // Notify the user after saving the last extra
        function saveExtrasPromise(){
            // Wait for the last extra to be saved, then redirect the user
            if(i === Object.keys(Page.extras).length){
                // Success message
                $rootScope.$broadcast('notify', {message: 'Saved'});
                // Redirect to new page
                $location.path($scope.page.url);
            } else
                i++;
        }

        // Update the page after it's been saved
        function updatePagePromise(data){
            // Delete old tags
            REST.contentTags.delete({ contentID: $scope.page.id }, deleteTagsPromise);

            // Save page as a revision
            REST.contentRevisions.save({
                contentID: $scope.page.id,
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header,
                subheader: Page.subheader,
                featured: featured,
                body: Page.body,
                url: $scope.page.url,
                type: $scope.page.type,
                published: $scope.page.publish,
                published_date: $scope.page.scheduleDate,
                author: Users.id
            }, savePageRevisionPromise);
        }
        
        // Callback for saving a page revision
        function savePageRevisionPromise(data){
            revisionID = data.id;
            var i = 1;

            // Delete old extras
            REST.contentExtras.delete({ contentID: $scope.page.id }, deleteExtrasPromise);
        }

        // Callback after tags are deleted
        function deleteTagsPromise(){
            // Save new tags
            angular.forEach($scope.page.tags, function(value){
                REST.contentTags.save({ contentID: $scope.page.id, tag: value });
            });
        }

        // Callback after deleting extras
        function deleteExtrasPromise(){
            // Save additional data
            for (var key in Page.extras){
                if (Page.extras.hasOwnProperty(key)){

                    // Stringify arrays and objects
                    if(typeof Page.extras[key] === 'object')
                        Page.extras[key] = angular.toJson(Page.extras[key]);

                    // Save new extra
                    REST.contentExtras.save({
                        contentID: $scope.page.id,
                        name: key,
                        extra: Page.extras[key]
                    }, saveExtrasPromise, saveExtrasPromise);

                    // Save new extra to revisions
                    REST.contentRevisionsExtras.save({
                        revisionID: revisionID,
                        contentID: $scope.page.id,
                        name: key,
                        extra: Page.extras[key]
                    });
                }
            }
            // If there were no extras, notify right away
            if(!Page.extras.length)
                $rootScope.$broadcast('notify', {message: 'Page Updated'});
        }
    };
}])


/**************************************************
 *              Profile Controller                *
 *              Edit your profile                 *
 **************************************************/

.controller('profileCtrl', ['$scope', 'REST', '$rootScope', 'ngDialog', 'Users', function($scope, REST, $rootScope, ngDialog, Users){

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
        if(!$scope.profile.photo)
            $scope.profile.photo = 'core/img/image.svg'; // Placeholder image
    });

    // Add a profile photo
    $scope.addProfilePhoto = function(){
        ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({ id: 'profile' }) });
    };

    // Watch for edits to the profile photo
    $scope.$on('choseFile', function(event, data){
        if(data.id === 'profile')
            $scope.profile.photo = data.src;
    });
    
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

}])

/**************************************************
 *            Revisions Controller                *
 *         Check the revision history             *
 **************************************************/

.controller('revisionsCtrl', ['$scope', 'REST', 'Page', '$rootScope', function($scope, REST, Page, $rootScope){

    // Get all revisions for this url
    REST.contentRevisions.query({ contentID: Page.id }, function(data){
        $scope.revisions = data;
    });

    // Get the file clicked and the previous version
    $scope.getRevision = function(index){
        var current = $scope.revisions[index];
        var previous = $scope.revisions[index+1];

        Page.title = $scope.compare(previous.title, current.title).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.description = $scope.compare(previous.description, current.description).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.body = $scope.compare(previous.body, current.body).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.header = $scope.compare(previous.header, current.header).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.subheader = $scope.compare(previous.subheader, current.subheader).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        $rootScope.$broadcast('contentGet');
    };

    // Set the source file
    $scope.compare = function(previous, current){
        if(!current)
            current = '';
        if(!previous)
            previous = '';

        var dmp = new diff_match_patch();
        var d = dmp.diff_main(previous, current);
        dmp.diff_cleanupSemantic(d);
        return dmp.diff_prettyHtml(d);
    };

    // Revert to previous edition
    $scope.revert = function(index){
        REST.contentRevisions.save({ contentID: Page.id, revisionID: $scope.revisions[index].id }, function(){
            $rootScope.$broadcast('notify', {message: 'Content has been revised'});
        });
    };

}])

/**************************************************
 *             Settings Controller                *
 *        Manage the settings of the site         *
 **************************************************/

.controller('settingsCtrl', ['$scope', 'REST', '$rootScope', 'Page', 'ngDialog', '$translate', function($scope, REST, $rootScope, Page, ngDialog, $translate){

    $scope.settings = {};
    $scope.settings.siteName = Page.settings.site_name;
    $scope.settings.logo = Page.settings.logo;
    $scope.settings.favicon = Page.settings.favicon;
    $scope.settings.slogan = Page.settings.slogan;
    $scope.settings.email = Page.settings.email;
    $scope.settings.language = Page.settings.language;
    $scope.settings.maintenanceURL = Page.settings.maintenance_url;
    if(Page.settings.maintenance_mode)
        $scope.settings.maintenanceMode = true;

    // Default if no custom images were set
    if(!$scope.settings.logo)
        $scope.settings.logo = 'core/img/image.svg';
    if(!$scope.settings.favicon)
        $scope.settings.favicon = 'core/img/image.svg';

    // Add a profile photo
    $scope.uploadPhoto = function(type){
        ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({ id: type }) });
    };

    // Watch for edits to the logo or favicon
    $scope.$on('choseFile', function(event, data){
        if(data.id === 'logo')
            $scope.settings.logo = data.src;
        else if(data.id === 'favicon')
            $scope.settings.favicon = data.src;
    });
    
    $scope.changeLanguage = function(key){
        $translate.use(key);
    };

    // Save settings
    $scope.changeSettings = function(){
        REST.settings.update({
            siteName: $scope.settings.siteName,
            slogan: $scope.settings.slogan,
            logo: $scope.settings.logo,
            favicon: $scope.settings.favicon,
            email: $scope.settings.email,
            language: $scope.settings.language,
            maintenanceURL: $scope.settings.maintenanceURL,
            maintenanceMode: $scope.settings.maintenanceMode
        }, function(data){
            $rootScope.$broadcast('notify', {message: 'Settings updated'});
        });
    };

}])

/**************************************************
 *              Themes Controller                 *
 *              Edit the theme                    *
 **************************************************/

.controller('themeCtrl', ['$scope', 'REST', '$http', function($scope, REST, $http){
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

}])

/**************************************************
 *               Users Controller                 *
 *               Manage all users                 *
 **************************************************/

.controller('usersCtrl', ['$scope', 'REST', '$rootScope', 'ngDialog', function($scope, REST, $rootScope, ngDialog){

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

}])

/**************************************************
 *           Admin Panel Directive                *
 *        Format theme html files into            *
 *        user-friendly page options              *
 **************************************************/
 
.filter('themeFiles', function(){
    return function(input){
        if(input){
            // Don't include folders in the name
            var parts = input.split('/');
            var output = parts[parts.length-1];
            // Remove .html extension
            output = output.replace(/\.html/g,' ');
            // Replace hyphens with spaces
            output = output.replace(/\-/g,' ');
            // Capitalize the first letter of every word
            output = output.replace(/\b./g, function(m){ return m.toUpperCase(); });

            return output.trim();
        } else
            return input;
    };
});