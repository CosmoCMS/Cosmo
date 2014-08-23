'use strict';
angular.module('cosmo', [])

/****************************************************************************************************
 *                                           Controllers                                            *
 ****************************************************************************************************/





/**************************************************
 *              Search Controller                 *
 **************************************************

.controller('searchCtrl', ['$scope', '$http', 'Page', '$rootScope', '$location', function($scope, $http, Page, $rootScope, $location){
    $scope.search = function(){
        $http.query('search.cosmo.io', { q: $scope.search }, function(data){
            $scope.results = data;
            $location.path('/results');
        });
    };
}])
*/

/**************************************************
 *              URL Controller                    *
 **************************************************/

.controller('urlCtrl', ['$scope', '$routeParams', 'Page', '$rootScope', 'REST', '$location', 'Users', function($scope, $routeParams, Page, $rootScope, REST, $location, Users){
    
    // Reset variables while new page loads
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
            if(Page.settings.maintenance_mode && Page.settings.maintenance_url && !Users.admin){
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
        if(data.type)
            Page.type = data.type;
        else
            Page.type = Page.templatePages[0];
        Page.publish = data.published;
        Page.scheduleDate = data.published_date;
        Page.timestamp = data.timestamp;
        if(data.extras)
            Page.extras = data.extras;
        else
            Page.extras = {};
        
        if(Page.theme)
            $scope.template = Page.prefix + 'themes/' + Page.theme + '/' + Page.type;
        
        $rootScope.$broadcast('contentGet', data);
        
        // Get blocks
        REST.blocks.query({ type: Page.type, url: $location.path() }, function(data){
            Page.blocks = data;
            $rootScope.$broadcast('blocksGet', data);
        });
        
    }, function(data){ // Page not found
        $location.path(Page.prefix + 'error').replace();
    });
    
    // Update the theme if it's been changed
    var changeTheme = function(){
        if($scope.template !== Page.prefix + '/themes/' + Page.theme + '/' + Page.type && Page.theme && Page.type)
            $scope.template = Page.prefix + '/themes/' + Page.theme + '/' + Page.type;
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
}])

/****************************************************************************************************
 *                                           Directives                                             *
 ****************************************************************************************************/





/**************************************************
 *              Block Directive                   *
 **************************************************/

.directive('block', ['Page', '$compile', function(Page, $compile) {
    return {
        link: function(scope, elm, attrs, ctrl) {
            
            var updateBlocks = function() {
                // Match the block(s) to the right location
                if(Page.blocks) {
                    var blockHTML = '';
                    angular.forEach(Page.blocks, function(data){
                        if(data.area === attrs.block) {
                            blockHTML += data.block;
                        }
                    });
                    elm.html(blockHTML);
                    $compile(elm.contents())(scope);
                }
            };
            updateBlocks();
            
            scope.$on('blocksGet', function(){
                updateBlocks();
            });
        }
    };
}])

/**************************************************
 *              Cosmo Directive                   *
 **************************************************/

.directive('cosmo', ['Page', '$routeParams', '$sce', '$rootScope', 'growl', '$compile', 'Users', function(Page, $routeParams, $sce, $rootScope, growl, $compile, Users) {
    return {
        priority: 100,
        link: function(scope, elm, attrs, ctrl) {
            
            scope.editor = {};
            scope.editor.codeEditor = false;
            
            var updateCosmo = function(){
                
                if(Page[attrs.cosmo])
                    var content = Page[attrs.cosmo];
                else if(Page.extras[attrs.cosmo])
                    var content = Page.extras[attrs.cosmo];
                else if(attrs.prepopulate && Users.admin)
                    var content = attrs.prepopulate;
                else
                    var content = ' ';
                
                if(content)
                    content = content.toString();
                
                // Remove HTML tags if this is a text only area
                if(attrs.type === 'text')
                    content = content.replace(/<[^<]+?>/g, '');
                
                if(content){
                    elm.html(content);
                    if(attrs.type !== 'text')
                        $compile(elm.contents())(scope);
                }
                
            };
            updateCosmo();
            
            scope.$on('contentGet', function(){
                updateCosmo();
            });
            
            // Display the WYSIWYG toolbar
            elm.on('mousedown', function(event) {
                scope.currentBlock = attrs.cosmo; 
                if(attrs.type !== 'text')
                    $rootScope.$broadcast('activateWYSIWYG', event);
            });
            
            // See if user is an admin
            if(Users.admin) {
                
                // Remove HTML tags on pasted text
                elm.on('paste', function(event){
                    // Don't edit if the modal window is open
                    if(Page.misc.wysiwyg.modalOpen){
                        event.preventDefault();
                    } else if(!scope.editor.codeEditor){ // Strip out HTML tags from text pasted into the WYSIWYG editor
                        event.preventDefault();
                        var pastedText = event.originalEvent.clipboardData.getData('text/plain');
                        document.execCommand("insertHTML", false, pastedText.replace(/<[^<]+?>/g, ''));
                    }
                });
                
                // Watch for edits to the page and save them
                elm.on('keyup focusout', function(event) {
                    // Open quick-save option
                    // growl.addSuccessMessage('<a ng-controller="pageCtrl" ng-click="savePage()">Quick Save</a>');
                    
                    // Make sure we aren't saving escaped HTML
                    if(scope.editor.codeEditor)
                        var html = scope.unescapeHTML(elm.html());
                    else
                        var html = elm.html();
                    
                    // Don't save the fields marked 'none'
                    if(attrs.cosmo === 'none') {
                        $rootScope.$broadcast('wysiwygEdit', { html: html });
                    } else
                    {
                        // Save changes to Page factory
                        if(attrs.cosmo !== 'header' && attrs.cosmo !== 'subheader' && attrs.cosmo !== 'body')
                            if(attrs.type === 'text')
                                Page.extras[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                            else
                                Page.extras[attrs.cosmo] = html;
                        else{
                            if(attrs.type === 'text')
                                Page[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                            else
                                Page[attrs.cosmo] = html;
                        }
                        
                        // Save to local storage
                        localStorage.setItem($routeParams.url + attrs.cosmo, html);
                    }
                });
                
                // Make content editable
                elm.attr('contenteditable', 'true');
                
                // Hide toolbar on focus out
                elm.on('focusout', function(){
                    $rootScope.$broadcast('hideWYSIWYG');
                });
                
                // View HTML code
                scope.$on('toggleHTMLEditor', function(){
                    // Make sure to only edit the selected block
                    if(scope.currentBlock === attrs.cosmo){
                        scope.editor.codeEditor = !scope.editor.codeEditor;
                        if(scope.editor.codeEditor)
                            elm.html(scope.escapeHTML(elm.html()));
                        else
                            elm.html(scope.unescapeHTML(elm.html()));
                    }
                });
                
                // Save data and refresh the page
                scope.$on('saveAndRefresh', function(){
                    // Make sure we aren't saving escaped HTML
                    if(scope.editor.codeEditor)
                        var html = scope.unescapeHTML(elm.html());
                    else
                        var html = elm.html();
                    
                    // Save changes to Page factory
                    if(attrs.cosmo !== 'header' && attrs.cosmo !== 'subheader' && attrs.cosmo !== 'body')
                        if(attrs.type === 'text')
                            Page.extras[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                        else
                            Page.extras[attrs.cosmo] = html;
                    else {
                        if(attrs.type === 'text')
                            Page[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                        else
                            Page[attrs.cosmo] = html;
                    }
                    
                    setTimeout(function(){
                        $rootScope.$broadcast('contentGet');
                    });
                    
                });
                
                // Escape HTML
                scope.escapeHTML = function(str) {
                    return '<pre>'+ String(str)
                        .replace(/\n/g, '')
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '\n&lt;')
                        .replace(/>/g, '&gt;\n') + '</pre>';
                };
                
                // Revert to normal text from HTML
                scope.unescapeHTML = function(str) {
                    // Remove <pre> formating
                    if(str.indexOf('<pre') === 0)
                        str = str.slice(str.indexOf('>') + 1, str.length - 6);
                    
                    return String(str)
                        .replace(/\n/g, '')
                        .replace(/&amp;/g, '&')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');
                };
            }
        }
    };
}])

/**************************************************
 *             BGImage Directive                  *
 **************************************************/

.directive('bgimage', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', 'Responsive', 'Hooks', function(Page, $routeParams, $rootScope, ngDialog, Users, Responsive, Hooks) {
    return {
        link: function(scope, elm, attrs, ctrl) {
            
            function updateBGImage(){
                if(Page.extras[attrs.bgimage]){
                    Page.extras[attrs.bgimage] = angular.fromJson(Page.extras[attrs.bgimage]);
                    if(Page.extras[attrs.bgimage].responsive === 'yes')
                        var imageURL = Hooks.imageHookNotify(Responsive.resize(Page.extras[attrs.bgimage].src, Page.extras[attrs.bgimage].size));
                    else
                        var imageURL = Hooks.imageHookNotify(Page.extras[attrs.bgimage].src);
                    elm.css('background', 'url('+ imageURL +') center no-repeat');
                    elm.css('-webkit-background-size', 'cover');
                    elm.css('-moz-background-size', 'cover');
                    elm.css('-o-background-size', 'cover');
                    elm.css('background-size', 'cover');
                } else if(Users.admin) {
                    elm.css('background', 'url(img/image.svg) center no-repeat');
                    elm.css('-webkit-background-size', 'cover');
                    elm.css('-moz-background-size', 'cover');
                    elm.css('-o-background-size', 'cover');
                    elm.css('background-size', 'cover');
                }
            }
            updateBGImage();
            
            scope.$on('contentGet', function(){
                updateBGImage();
            });
            
            // Check if user is an admin
            if(Users.admin) {
                
                // Edit photo when double clicked
                scope.clicked = function(){
                    scope.lastClicked = attrs.bgimage;
                    ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({ id: attrs.bgimage }) });
                };
                
                // Update page when another image is chosen
                scope.$on('choseFile', function(event, data){
                    if(data.id === scope.lastClicked){
                        Page.extras[scope.lastClicked] = data;
                        elm.css('background', 'url('+ data.src +') center no-repeat');
                        elm.css('-webkit-background-size', 'cover');
                        elm.css('-moz-background-size', 'cover');
                        elm.css('-o-background-size', 'cover');
                        elm.css('background-size', 'cover');
                    }
                });
            }
        }
    };
}])

/**************************************************
 *              Image Directive                   *
 **************************************************/

.directive('image', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', 'REST', '$compile', '$http', 'Responsive', 'Hooks', function(Page, $routeParams, $rootScope, ngDialog, Users, REST, $compile, $http, Responsive, Hooks){
    return {
        scope: {
            image: '@'
        },
        template: '<img ng-src="{{src}}" class="{{image.class}}" alt="{{image.alt}}" title="{{image.title}}" size="{{image.size}}" />',
        replace: true,
        compile: function(scope, elm, attrs, ctrl) {
            return {
                pre: function(scope, elm, attrs){
                    attrs.ngSrc = '{{src}}';
                },
                post: function(scope, elm, attrs){
                    
                    scope.image = {};
                    
                    // Initialize the image data
                    if(Page.extras[attrs.image]){
                        Page.extras[attrs.image] = angular.fromJson(Page.extras[attrs.image]);
                        scope.image.class = Page.extras[attrs.image].class;
                        scope.image.alt = Page.extras[attrs.image].alt;
                        scope.image.title = Page.extras[attrs.image].title;
                        scope.image.size = Page.extras[attrs.image].size;
                        
                        // Get responsive URL for the image
                        if(Page.extras[attrs.image].responsive === 'yes')
                            scope.src = Hooks.imageHookNotify(Responsive.resize(Page.extras[attrs.image].src, Page.extras[attrs.image].size));
                        else
                            scope.src = Hooks.imageHookNotify(Page.extras[attrs.image].src);
                        
                        // Check if this image should be linked
                        if(Page.extras[attrs.image].href)
                            elm.wrap('<a href="'+ Page.extras[attrs.image].href +'"></a>');
                        
                    } else if(Users.admin)
                        scope.src = 'img/image.svg';
                    
                    // Check if user is an admin
                    if(Users.admin) {
                        // Open image editing modal
                        elm.on('click', function(){
                            scope.lastClicked = attrs.image;
                            ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({ id: attrs.image }) });
                        });
                        
                        // Save edits to the image
                        scope.$on('choseFile', function(event, data){
                            if(data.id === scope.lastClicked){
                                Page.extras[scope.lastClicked] = data;
                                scope.image = data;
                                // Get responsive URL for the image
                                scope.src = Responsive.resize(Page.extras[attrs.image].src, Page.extras[attrs.image].size);
                            }
                        });
                    }
                }
            };
        }
    };
}])

/**************************************************
 *           Image Gallery Directive              *
 **************************************************/

.directive('gallery', ['Page', '$rootScope', 'REST', '$timeout', 'ngDialog', 'Users', '$sce', 'Responsive', 'Hooks', function(Page, $rootScope, REST, $timeout, ngDialog, Users, $sce, Responsive, Hooks){
    return {
        template: '<img ng-src="{{image.url}}" ng-repeat="image in images | filter:search" ng-hide="$index!==currentIndex && showOnlyOne" ng-click="clickedGallery($index)">',
        replace: true,
        link: function(scope, elm, attrs){
            
            function updateGallery(){
                // Get images
                if(Page.extras[attrs.gallery]){
                    Page.extras[attrs.gallery] = angular.fromJson(Page.extras[attrs.gallery]);
                    var gallery = angular.copy(Page.extras[attrs.gallery]);
                    // Make all images responsive
                    angular.forEach(gallery, function(image){
                        if(image.responsive === 'yes')
                            image.url = Hooks.imageHookNotify(Responsive.resize(image.url, image.size));
                        else
                            image.url = Hooks.imageHookNotify(image.url);
                    });
                    scope.images = gallery;
                } else if(Users.admin) {
                    Page.extras[attrs.gallery] = [{ url: 'img/image.svg', type: 'image' }];
                    scope.images = [{ url: 'img/image.svg', type: 'image' }];
                }
                $rootScope.$broadcast(attrs.gallery, scope.images);
            }
            updateGallery();
            
            scope.$on('contentGet', function(){
                updateGallery();
            });
            
            // Apply filtering if available
            if(attrs.filter){
                scope.$on(attrs.filter, function(event, data){
                    scope.search = data.term;
                });
            }
            
            // Check if image should be hidden
            if(attrs.type === 'slider'){
                scope.showOnlyOne = true;
                scope.currentIndex = 0;
                scope.$on(attrs.gallery + '-changeIndex', function(event, data){
                    scope.currentIndex = data.index;
                });
            } else
                scope.showOnlyOne = false;
            
            // Check if user is an admin
            if(Users.admin) {
                // When clicked, open a modal window to edit
                scope.clickedGallery = function(index){
                    scope.lastClicked = attrs.gallery;
                    ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({ 
                            id: attrs.gallery, 
                            gallery: true, 
                            images: Page.extras[attrs.gallery] 
                        }) 
                    });
                };
                
                // Watch for edits to the gallery
                scope.$on('choseGalleryFile', function(event, data){
                    if(data.id === scope.lastClicked){
                        // Get raw URL
                        var records = [];
                        angular.forEach(data.data, function(item){
                            if(typeof item.url === 'string')
                                records.push(item);
                            else {
                                records.push({
                                    alt: item.alt,
                                    class: item.class,
                                    href: item.href,
                                    id: item.id,
                                    tags: item.tags,
                                    title: item.title,
                                    type: item.type,
                                    url: $sce.getTrustedUrl(item.url)
                                });
                            }
                        });
                        Page.extras[scope.lastClicked] = records;
                        scope.images = data.data;
                        if(data.class)
                            elm.addClass(data.class);
                        
                        updateGallery();
                    }
                });
            }
        }
    };
}])

/**************************************************
 *                Link Directive                  *
 **************************************************/

.directive('link', ['Page', 'ngDialog', 'Users', function(Page, ngDialog, Users){
    return {
        scope: {
            link: '@'
        },
        template: '<a ng-href="{{data.url}}" ng-click="editLink($event)">{{data.text}}</a>',
        replace: true,
        controller: 'linkCtrl',
        link: function(scope, elm, attrs){
            
            if(Page.extras[attrs.link]){
                var linkArr = Page.extras[attrs.link].split(';;');
                scope.data = { text: linkArr[0], url: linkArr[1] };
            } else if(Users.admin)
                scope.data = { text: 'Add a Link', url: '' };
            
            // Check if user is an admin
            if(Users.admin) {
                // Edit this link if you are logged in as an administrator
                scope.editLink = function($event){
                    $event.preventDefault();
                    ngDialog.open({ template: 'core/html/partials/link.html' });
                };

                // Watch for edits to the gallery
                scope.$on('editedLink', function(event, obj){
                    scope.data.text = obj.text;
                    scope.data.url = obj.url;
                    Page.extras[attrs.link] = obj.text + ';;' + obj.url;
                });
            }
            
        }
    };
}])

/**************************************************
 *               Link Controller                  *
 **************************************************/

.controller('linkCtrl', ['$scope', '$rootScope', 'ngDialog', function($scope, $rootScope, ngDialog){
    $scope.save = function(){
        $rootScope.$broadcast('editedLink', {text: $scope.link.text, url: $scope.link.url});
        ngDialog.close();
    };
}])

/**************************************************
 *              Movie Directive                   *
 **************************************************/

.directive('movie', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', '$sce', function(Page, $routeParams, $rootScope, ngDialog, Users, $sce) {
    return {
        template: '<video autoplay loop ng-click="clicked()"><source ng-repeat="video in videos" ng-src="{{video.src}}"></video>',
        replace: true,
        link: function(scope, elm, attrs, ctrl) {
            
            if(Page.extras[attrs.movie])
                scope.videos = Page.extras[attrs.movie];
            else if(Users.admin)
                scope.videos = [{ src: 'img/image.svg', type: 'video' }];
            
            // Check if user is an admin
            if(Users.admin) {
                scope.clicked = function(){
                    scope.lastClicked = attrs.movie;
                    // ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({ id: attrs.movie }) });
                    
                    ngDialog.open({ template: 'core/html/modal.html', data: angular.toJson({
                            id: attrs.movie,
                            gallery: true,
                            images: scope.videos // Page.extras[attrs.movie]
                        })
                    });
                };
                
                // Save edits/selection of the movie
                scope.$on('choseGalleryFile', function(event, data){
                    if(data.id === scope.lastClicked){
                        Page.extras[scope.lastClicked] = data.data;
                        scope.videos = data.data;
                        if(data.class)
                            elm.addClass(data.class);
                    }
                });
            }
        }
    };
}])

/**************************************************
 *              Menus Directive                   *
 **************************************************/

.directive('menu', ['Page', '$compile', function(Page, $compile) {
    return {
        templateUrl: 'core/html/partials/menu-links.html',
        replace: true,
        link: function(scope, elm, attrs, ctrl) {
            // Match the menu to the right location
            var updateMenus = function(){
                angular.forEach(Page.menus, function(data){
                    if(data.area === attrs.menu && data.menu)
                        scope.list = angular.fromJson(data.menu);
                });
            };
            updateMenus();
            
            scope.$on('menusGet', function(){
                updateMenus();
            });
        }
    };
}])

/**************************************************
 *               Modal Directive                  *
 **************************************************/
/*
.directive('modal', [function(){
    return {
        templateUrl: 'core/html/modal.html',
        replace: true,
        link: function(scope, elm, attrs){
            
            // Open the modal
            scope.$on('modalOpen', function(data){
                scope.showModal = true;
            });
            
            // Close the modal
            scope.$on('modalClose', function(data){
                scope.showModal = false;
            });
        }
    };
}])
*/

/**************************************************
 *              Notify Directive                  *
 **************************************************/

.directive('notification', ['$timeout', function($timeout){
    return {
        template: '<div ng-show="showNotification" class="{{classes}}"><a ng-click="showNotification=false">x</a>{{message}}</div>',
        replace: true,
        link: function(scope, elm, attrs){
            
            scope.showNotification = true;
            scope.message = 'Hi there!';
            scope.classes = 'alert-alert';
            
            scope.$on('notify', function(data){
                scope.showNotification = true;
                scope.message = data.message;
                
                // Default class is alert-alert
                if(!data.classes)
                    scope.classes = 'alert-alert';
                else
                    scope.classes = data.classes;
                
                // Default duration is 5 seconds
                if(!data.duration)
                    data.duration = 5000;
                
                // Disappear after 5 seconds
                $timeout(function(){
                    scope.showNotification = false;
                }, data.duration);
            });
        }
    };
}])

// Control meta tags
.controller('HTMLCtrl', ['$scope', 'Page', 'Hooks', '$rootScope', 'Users', function($scope, Page, Hooks, $rootScope, Users){
    
    if(Users.admin)
        $scope.admin = true;
    
    // Update meta-tags
    var updateMetaTags = function(){
        var data = Hooks.HTMLHookNotify({title: Page.title, description: Page.description});
        $scope.title = data.title;
        $scope.description = data.description;
        $rootScope.$broadcast('HTMLCallback', {title: $scope.title, description: $scope.description});
    };
    updateMetaTags();
    
    $scope.$on('contentGet', function(){
        updateMetaTags();
    });
    
    // Check if the user is an administrator
    if(Users.role === 'admin')
        $scope.admin = true;
    
    // Watch for admin logins
    $scope.$on('adminLogin', function(data){
        $scope.admin = true;
        Users.admin = true;
    });
}])

// Create a login box
.directive('login', function() {
    return {
        templateUrl: 'core/html/partials/user-login.html',
        replace: true,
        controller: 'loginRegistrationCtrl'
    };
})

// Create a registration box
.directive('registration', function() {
    return {
        templateUrl: 'core/html/partials/user-registration.html',
        replace: true,
        controller: 'loginRegistrationCtrl'
    };
})

// Login/Registration Controller
.controller('loginRegistrationCtrl', ['$scope', 'REST', '$http', 'ngDialog', '$location', '$rootScope', 'Users', 'Page', 'growl', function($scope, REST, $http, ngDialog, $location, $rootScope, Users, Page, growl){
    
    // Initialize panel to show
    $scope.panel = 'login';
    $scope.login = {};
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
                growl.addSuccessMessage("Account created");
                ngDialog.close();
                $location.path('/');
            }, function(){ // Error
                growl.addErrorMessage("Username/Email is already in use");
            });
        } else {
            alert("Passwords don't match");
        }
        $rootScope.$broadcast('registered', { usernamem: $scope.register.username, email: $scope.register.email });
    };
    
    // Login
    $scope.login = function(){
        REST.users.get({ username: $scope.login.username, password: $scope.login.password, dontcache: new Date().getTime() }, function(data){
            if(data.token){
                // Set cookie and headers with username and auth token
                var expdate = new Date();
                expdate.setDate(expdate.getDate() + 90); // 90 days in the future
                document.cookie= "usersID=" + data.id + ";expires=" + expdate.toGMTString();
                document.cookie= "username=" + $scope.login.username.toLowerCase() + ";expires=" + expdate.toGMTString();
                document.cookie= "token=" + data.token + ";expires=" + expdate.toGMTString();
                document.cookie= "role=" + data.role + ";expires=" + expdate.toGMTString();
                
                $http.defaults.headers.common['username'] = $scope.login.username.toLowerCase();
                $http.defaults.headers.common['token'] = data.token;
                
                Users.id = data.id;
                Users.username = $scope.login.username.toLowerCase();
                Users.role = data.role;
                
                // Check if the user is an administrator
                if(data.role === 'admin')
                    $rootScope.$broadcast('adminLogin');
                
                $scope.login.username = '';
                $scope.login.password = '';
                ngDialog.close();
                $location.path('/');
                
                $rootScope.$broadcast('loggedIn');
            } else
                alert('Wrong Username/Password');
        });
    };
    
    // Log the user out
    $scope.logout = function(){
        // Delete cookies
        document.cookie = 'username=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'usersID=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'token=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        Users.id = '';
        Users.username = '';
        $http.defaults.headers.common['username'] = '';
        $http.defaults.headers.common['token'] = '';
        location.reload(); // Refresh the page
    };
    
    // Reset password
    $scope.resetPassword = function(){
        if($scope.login.username){
            REST.users.update({ username: $scope.login.username }, function(data){
                growl.addSuccessMessage("Check your email for password reset instructions");
            });
        } else 
            alert('Error: You must enter your username to reset your password');
    };
    
    // Change Username
    $scope.changeUsername = function(){
        REST.users.update({ userID: Users.id, username: $scope.username }, function(){
            growl.addSuccessMessage("Username Updated");
        });
    };
    
    // Change email address
    $scope.changeEmail = function(){
        REST.users.update({ userID: Users.id, email: $scope.email }, function(data){
            growl.addSuccessMessage("Email Updated");
        });
    };
    
    // Change password
    $scope.changePassword = function(){
        REST.users.update({ userID: Users.id, password: $scope.password }, function(){
            growl.addSuccessMessage("Password Updated");
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
            $location.path('/');
        });
    };
    
}])

// Forgotten password reset
.controller('resetModal', ['ngDialog', function(ngDialog){
    // Open modal
    ngDialog.open({ template: 'themes/KHP/partials/forgotpassword.html', controller: 'resetPasswordCtrl' });
}])

// Forgotten password reset
.controller('resetPasswordCtrl', ['$routeParams', '$scope', 'ngDialog', 'REST', '$location', function($routeParams, $scope, ngDialog, REST, $location){
    
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
    
}])

// Search directive
.directive('search', function() {
    return {
        template: '<input type=text"" placeholder="Search..." ng-model="search">',
        controller: 'searchCtrl',
        link: function(scope, elm, attrs, ctrl) {
            
        }
    };
})

// Search results page
.directive('results', ['Page', function(Page) {
    return {
        templateUrl: 'core/html/partials/results.html',
        link: function(scope, elm, attrs, ctrl) {
            scope.results = Page.results;
        }
    };
}])


/****************************************************************************************************
 *                                               Factories                                          *
 ****************************************************************************************************/


// Create Page factory to store page variables globally
.factory('Page', function(){
    return {
        id: 0,
        title: '',
        description: '',
        header: '',
        subheader: '',
        body: '',
        url: '',
        type: '',
        prefix: '',
        published: '',
        published_date: '',
        templatePages: [],
        timestamp: '',
        extras: [],
        misc: {}
    };
})

// Factory for responsive images
.factory('Responsive', ['$http', function($http){
    return {
        resize: function(imageURL, maxSize){
            
            // Make sure the image URL is a string, responsive feature isn't disabled, and the image isn't already a smaller size.
            if(!angular.isString(imageURL) || maxSize === 'nonresponsive' || imageURL.indexOf('-2048') > 0 || imageURL.indexOf('-1024.') > 0 || imageURL.indexOf('-512.') > 0 || imageURL.indexOf('-320.') > 0)
                return imageURL;
            
            // Check screen size for responsive images
            if(window.innerWidth >= 2048)
                var quality = 2048;
            else if(window.innerWidth >= 1024)
                var quality = 1024;
            else if(window.innerWidth >= 512)
                var quality = 512;
            else
                var quality = 320;
            
            // Make sure the image isn't larger than the max size
            if(maxSize){
                switch(maxSize){
                    case 'large':
                        if(quality > 1024)
                            quality = 1024;
                        break;
                    case 'medium':
                        if(quality > 512)
                            quality = 512;
                        break;
                    case 'small':
                        quality = 320;
                        break;
                    default:
                        break;
                }
            }
            
            var pos = imageURL.lastIndexOf('.');
            return imageURL.substring(0,pos)+'-'+quality+'.'+imageURL.substring(pos+1);
        }
    };
}])

// Register all Hooks
.factory('Hooks', function(){
    
    // Initialize all hooks
    var imageHooks = [];
    var HTMLHooks = [];
    
    return {
        // Image directive. Passes the URL of the image as a string
        imageHook: function(hook){
            imageHooks.push(hook);
        },
        imageHookNotify: function(data){
            var newData;
            angular.forEach(imageHooks, function(hook){
                // Feed the output from the last hook into the next
                if(newData)
                    newData = hook(newData);
                else
                    newData = hook(data);
            });
            if(newData) // Return data after handing it off to any hooks
                return newData;
            else
                return data;
        },
        // HTML Ctrl. Passes an object with 'title', and 'description' parameters
        HTMLHook: function(hook){
            HTMLHooks.push(hook); // Register Hook
        },
        HTMLHookNotify: function(data){
            var newData;
            angular.forEach(HTMLHooks, function(hook){
                // Feed the output from the last hook into the next
                if(newData)
                    newData = hook(newData);
                else
                    newData = hook(data);
            });
            if(newData) // Return data after handing it off to any hooks
                return newData;
            else
                return data;
        }
    };
})

// Control RESTful operations
.factory('REST', ['$resource', 'Page', function($resource, Page) {

    return {
        'blocks': $resource(Page.prefix +'api/blocks/:blockID', { blockID: '@blockID'},{ update: { method: 'PUT' } }),
        'blocksRequirements': $resource(Page.prefix +'api/blocks/:blockID/requirements/:requirementID', { blockID: '@blockID', requirementID: '@requirementID'},{ update: { method: 'PUT' } }),
        'content': $resource(Page.prefix +'api/content/:contentID', { contentID: '@contentID'},{ update: { method: 'PUT' } }),
        'contentExtras': $resource(Page.prefix +'api/content/:contentID/extras/', { contentID: '@contentID'}),
        'contentRevisions': $resource(Page.prefix +'api/content/:contentID/revisions/:revisionID', { contentID: '@contentID', revisionID: '@revisionID'}, {update: { method: 'PUT' } }),
        'contentRevisionsExtras': $resource(Page.prefix +'api/content/:contentID/revisions/:revisionID/extras/:extraID', { revisionID: '@revisionID', contentID: '@contentID', extraID: '@extraID'}),
        'contentTags': $resource(Page.prefix +'api/content/:contentID/tags/', { contentID: '@contentID'}),
        'files': $resource(Page.prefix +'api/files/:fileID', { fileID: '@fileID'},{ update: { method: 'PUT' } }),
        'filesTags': $resource(Page.prefix +'api/files/:fileID/tag/:tag', { fileID: '@fileID', tag: '@tag'},{ update: { method: 'PUT' } }),
        'menus': $resource(Page.prefix +'api/menus/:menuID', { menuID: '@menuID'},{ update: { method: 'PUT' } }),
        'modules': $resource(Page.prefix +'api/modules/:moduleID', { moduleID: '@moduleID'},{ update: { method: 'PUT' } }),
        'sitemaps': $resource(Page.prefix +'api/sitemaps/'),
        'themes': $resource(Page.prefix +'api/themes/:themeID', { themeID: '@themeID' }, { update: { method: 'PUT' } }),
        'settings': $resource(Page.prefix +'api/settings/',{}, { update: { method: 'PUT' } }),
        'users': $resource(Page.prefix +'api/users/:userID', { userID: '@userID' }, { update: { method: 'PUT' } })
    };
}])

// Create Page factory to store page variables globally
.factory('Users', function() {
    return {
        email: '',
        id: '',
        role: '',
        username: '',
        permissions: []
    };
})

// Filter out html
.filter('plaintext', function(){
    return function(input){
        if(input){
            return input.replace(/<[^<]+?>/g, ' ').replace(/  /g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
        } else
            return input;
    };
})

.filter('titlecase', function(){
    return function(input){
        if(typeof input === 'string' && input){
            var words = input.split(' ');
            var exceptions = ' the a an and but or for nor aboard about above across after against along amid among around as at atop before behind below beneath beside between beyond by despite down during for from in inside into like near of off on onto out outside over past regarding round since than through throughout till to toward under unlike until up upon with within without ';
            for(var i=0; i<words.length; i++){
                if((i===0 || i===words.length-1 || exceptions.indexOf(' '+words[i].toLowerCase()+' ') === -1) && words[i])
                    words[i] = words[i][0].toUpperCase() + words[i].substring(1).toLowerCase();
            }
            return words.join(' ');
        } else
            return '';
    };
})

/**************************************************
 *              Table Directive                   *
 **************************************************/

.directive('cosmoTable', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', '$sce', '$timeout', function(Page, $routeParams, $rootScope, ngDialog, Users, $sce, $timeout) {
    return {
        template: '<table><tr ng-repeat="row in rows track by $index" ng-click="clickedRow({{$index}})" ng-init="isFirst=$first"><th ng-if="isFirst&&tableHeader" ng-repeat="col in row track by $index" ng-click="clickedCol({{$index}})">{{col}}</th><td ng-if="!isFirst||!tableHeader" ng-repeat="col in row track by $index" ng-click="clickedCol({{$index}})">{{col}}</td></tr></table>',
        replace: true,
        scope: {},
        link: function(scope, elm, attrs) {
            
            var updateCosmoTable = function(){
                if(Page.extras[attrs.cosmoTable])
                    scope.rows = angular.fromJson(Page.extras[attrs.cosmoTable]);
                else if(Users.admin)
                    scope.rows = [['', '']];
                
                scope.tableHeader = Page.extras[attrs.cosmoTable + '-header'];
            };
            updateCosmoTable();
            
            // Display the WYSIWYG toolbar
            elm.on('mousedown', function(event) {
                $rootScope.$broadcast('activateWYSIWYG', event);
            });
            
            // Keep track of the last clicked row
            scope.clickedRow = function(index){
                // scope.selectedRow = index;
                Page.misc.selectedRow = index;
                // scope.selectedTable = attrs.cosmoTable;
                Page.misc.selectedTable = attrs.cosmoTable;
            };
            
            // Keep track of the last clicked column
            scope.clickedCol = function(index){
                // scope.selectedCol = index;
                Page.misc.selectedCol = index;
            };
            
            // Check if user is an admin
            if(Users.admin) {
                
                // Save edits to the table every time it changes
                scope.$watch(function(){
                    return elm.html();
                }, function(){
                    // Wait till the end of the digest cycle, since this can execute multiple times a second.
                    $timeout(function(){
                        var rows = [];
                        var numRows = 0;
                        var numEmptyRows = 0;
                        // Iterate through every row/cell, grab the value and save it to the Page service
                        for(var i=0; i < elm[0].rows.length; i++){
                            rows[i] = [];
                            for(var j=0; j < elm[0].rows[i].cells.length; j++){
                                numRows++;
                                if(elm[0].rows[i].cells[j].innerHTML)
                                    rows[i][j] = elm[0].rows[i].cells[j].innerHTML.replace(/\n/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                                else {
                                    rows[i][j] = '';
                                    numEmptyRows++;
                                }
                            }
                        }
                        if(numRows !== numEmptyRows && numRows > 0) 
                            Page.extras[attrs.cosmoTable] = rows;
                    });
                });
                
                // Add table header
                scope.$on('addTableHeader', function(){
                    Page.extras[attrs.cosmoTable + '-header'] = true;
                    scope.tableHeader = true;
                });
                
                // Remove table header
                scope.$on('removeTableHeader', function(){
                    Page.extras[attrs.cosmoTable + '-header'] = false;
                    scope.tableHeader = false;
                });
                
                // Add a row above the selected row
                scope.$on('addRowAbove', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.cosmoTable){
                        var columns = [];
                        angular.forEach(scope.rows[0], function(){
                            columns.push('');
                        });
                        
                        //scope.rows.splice(scope.selectedRow, 0, columns);
                        Page.extras[attrs.cosmoTable].splice(Page.misc.selectedRow, 0, columns);
                        // Page.extras[attrs.cosmoTable] = angular.toJson(scope.rows);
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });
                
                // Add a row below the selected row
                scope.$on('addRowBelow', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.cosmoTable){
                        
                        var columns = [];
                        angular.forEach(scope.rows[0], function(){
                            columns.push('');
                        });
                        
                        // Check if this is the last row
                        if(scope.rows.length === Page.misc.selectedRow + 1)
                            Page.extras[attrs.cosmoTable].push(columns); // scope.rows.push(columns);
                        else
                            Page.extras[attrs.cosmoTable].splice(Page.misc.selectedRow+1, 0, columns); // scope.rows.splice(scope.selectedRow, 0, columns);
                        
                        // Page.extras[attrs.cosmoTable] = angular.toJson(scope.rows);
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });
                
                // Delete row
                scope.$on('deleteRow', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.cosmoTable){
                        // scope.rows.splice(scope.selectedRow, 1);
                        Page.extras[attrs.cosmoTable].splice(Page.misc.selectedRow, 1);
                        // Page.extras[attrs.cosmoTable] = angular.toJson(scope.rows);
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });
                
                // Add a column to the right of the selected column
                scope.$on('addColRight', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.cosmoTable){
                        // Iterate through all rows
                        var tempTable = angular.copy(Page.extras[attrs.cosmoTable]);
                        for(var i=0; i<tempTable.length; i++){
                            // Add a blank column (string) in the desired location
                            // scope.rows[i].splice(scope.selectedCol + 1, 0, '');
                            tempTable[i].splice(Page.misc.selectedCol + 1, 0, '');
                        }
                        Page.extras[attrs.cosmoTable] = tempTable; //scope.rows;
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });
                
                // Add a column to the left of the selected column
                scope.$on('addColLeft', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.cosmoTable){
                        // Iterate through all rows
                        var tempTable = angular.copy(Page.extras[attrs.cosmoTable]);
                        for(var i=0; i<tempTable.length; i++){
                            // Add a blank column (string) in the desired location
                            // scope.rows[i].splice(scope.selectedCol, 0, '');
                            tempTable[i].splice(Page.misc.selectedCol, 0, '');
                        }
                        Page.extras[attrs.cosmoTable] = tempTable; // scope.rows;
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });
                
                // Delete a column
                scope.$on('deleteCol', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.cosmoTable){
                        // Iterate through all rows
                        for(var i=0; i<scope.rows.length; i++){
                            // Delete the column in the desired location
                            // scope.rows[i].splice(scope.selectedCol, 1);
                            Page.extras[attrs.cosmoTable][i].splice(Page.misc.selectedCol, 1);
                            Page.misc.lastChange = data;
                        }
                        // Page.extras[attrs.cosmoTable] = scope.rows;
                        updateCosmoTable();
                    }
                });
                
                // Delete this table
                scope.$on('deleteTable', function(){
                    if(Page.misc.selectedTable === attrs.cosmoTable)
                        elm.remove();
                });
            }
        }
    };
}])

// Create/click an anchor link
.directive('anchor', ['$anchorScroll', '$location', function($anchorScroll, $location){
    return {
        link: function(scope, elm, attr){
            $anchorScroll();
            // Go to anchor
            elm.on('click', function(event){
                $location.hash(attr.anchor);
                $anchorScroll();
            });
        }
    };
}])

.controller('wysiwygCtrl', ['$scope', 'ngDialog', '$rootScope', 'Page', function($scope, ngDialog, $rootScope, Page){
    
    $scope.editor = {};
    $scope.editor.url = [];
    $scope.editor.text = [];
    $scope.editor.classes = [];
    $scope.editor.selected = '';
    $scope.editor.letter = 0;
    $scope.editor.rows = 5;
    $scope.editor.cols = 4;
    $scope.editor.pastedTable = '';
    $scope.lastKeyPress;
    
    // Initialize text input with selection if available
    if(Page.misc.wysiwyg.selection)
        $scope.editor.text = Page.misc.wysiwyg.selection.split('');
    
    // Watch for pasted text
    angular.element(document).on('paste', function(event){
        var pastedText = event.originalEvent.clipboardData.getData('text/plain');
        
        // Check if they are in the table modal
        if($scope.pastingTable === true){
            $scope.editor.pastedTable = pastedText;
            $scope.editor.pastedTableRows = [];
            angular.forEach(pastedText.split("\n"), function(row){
                $scope.editor.pastedTableRows.push(row.split("\t"));
            });
        } else { // User is in link modal
            $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 0, pastedText);
            $scope.editor.letter += pastedText.length;
        }
        $scope.$apply();
        event.preventDefault();
    });
    
    // Watch all keypresses
    angular.element(document).on('keydown', function(event){
        
        // If the modal is open, log keypresses to the modal instead of the window
        if(Page.misc.wysiwyg.modalOpen){
            // Watch for paste commands
            if(($scope.lastKeyPress === 91 || $scope.lastKeyPress === 17) && event.keyCode === 86)
                return true;
            
            if(event.keyCode === 8) { // delete key
                $scope.editor.letter = $scope.editor.letter-1;
                $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 1);
            } else {
                var character = '';
                // Standard letter character
                if(event.keyCode >= 65 && event.keyCode <= 90){
                    character = String.fromCharCode(event.keyCode);
                    if(!event.shiftKey)
                        character = character.toLowerCase();
                } else if(event.keyCode >= 48 && event.keyCode <= 57){
                    // Number
                    if(!event.shiftKey)
                        character = String.fromCharCode(event.keyCode);
                    else {
                        // Punctuation above numbers
                        switch(event.keyCode){
                            case 48:
                                character = ')';
                                break;
                            case 49:
                                character = '!';
                                break;
                            case 50:
                                character = '@';
                                break;
                            case 51:
                                character = '#';
                                break;
                            case 52:
                                character = '$';
                                break;
                            case 53:
                                character = '%';
                                break;
                            case 54:
                                character = '^';
                                break;
                            case 55:
                                character = '&';
                                break;
                            case 56:
                                character = '*';
                                break;
                            case 57:
                                character = '(';
                                break;
                            default:
                                break;
                        }
                    }
                } else {
                    // Check for special characters
                    switch(event.keyCode){
                        
                        case 32:
                            character = ' ';
                            break;
                            
                        case 186: 
                            if(event.shiftKey)
                                character = ':';
                            else
                                character = ';';
                            break;
                        
                        case 187: 
                            if(event.shiftKey)
                                character = '+';
                            else
                                character = '=';
                            break;
                        
                        case 188: 
                            if(event.shiftKey)
                                character = '<';
                            else
                                character = ',';
                            break;
                        
                        case 189: 
                            if(event.shiftKey)
                                character = '_';
                            else
                                character = '-';
                            break;
                        
                        case 190: 
                            if(event.shiftKey)
                                character = '>';
                            else
                                character = '.';
                            break;
                        
                        case 191: 
                            if(event.shiftKey)
                                character = '?';
                            else
                                character = '/';
                            break;
                        
                        case 192: 
                            if(event.shiftKey)
                                character = '~';
                            else
                                character = '`';
                            break;
                        
                        case 219: 
                            if(event.shiftKey)
                                character = '{';
                            else
                                character = '[';
                            break;
                        
                        case 220: 
                            if(event.shiftKey)
                                character = '|';
                            else
                                character = '\\';
                            break;
                        
                        case 221: 
                            if(event.shiftKey)
                                character = '}';
                            else
                                character = ']';
                            break;
                        
                        case 222: 
                            if(event.shiftKey)
                                character = '"';
                            else
                                character = "'";
                            break;
                        
                        default:
                            break;
                    }
                }
                
                if(character !== '') {
                    $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 0, character);
                    $scope.editor.letter++;
                }
            }
            
            $scope.$apply();
            $scope.lastKeyPress = event.keyCode;
            if(event.keyCode !== 91 && event.keyCode !== 17) // Don't prevent Ctrl and Command keys
                event.preventDefault();
        }
    });
    
    // Watch for the modal closing
    $rootScope.$on('ngDialog.closed', function(event, data){
        // Make the user's keypresses go to the screen instead of the modal
        Page.misc.wysiwyg.modalOpen = false;
    });
    
    // Clicked an input-like div
    $scope.clicked = function(event, item) {
        $scope.editor.selected = item; // Keep track of which variable is being edited
        $scope.editor.letter = $scope.editor[$scope.editor.selected].length;
        event.preventDefault(); // Don't take focus of WYSIWYG word(s)
    };
    
    // Clicked a letter in that div
    $scope.clickedLetter = function(index) {
        $scope.editor.letter = index;
    };
    
    // Check the URL to activate the open in new tab box automatically
    $scope.urlChanged = function() {
        // Check if it's a file from the uploads folder. e.g. PDF files
        if($scope.editor.url.indexOf('/uploads/') === 0)
            $scope.editor.newTab = true;
    };
    
    // Insert a new link
    $scope.insertLink = function(){
        var newTab = '';
        var url = $scope.editor.url.join('');
        
        // Check if link should open in a new tab
        if($scope.editor.newTab)
            var newTab = '_blank';
        
        // If they meant to redirect to a url, make sure it has http://
        if(url.indexOf('www.') === 0)
            url = 'http://' + url;
        
        document.execCommand('insertHTML', false, '<a href="'+ url +'" target="'+ newTab +'" class="'+ $scope.editor.classes.join('') +'">'+ $scope.editor.text.join('') +'</a>');
        ngDialog.close();
    };
    
    // Insert a table
    $scope.createTable = function(){
        var timestamp = new Date().getTime();
        var rows = [];
        var cols = [];
        
        // Check if the user pasted a table in the box
        if($scope.editor.pastedTable){
            var pastedTableRows = $scope.editor.pastedTable.split("\n");
            // Iterate through each row
            angular.forEach(pastedTableRows, function(row){
                var cellData = [];
                var cols = row.split("\t");
                // Iterate through each column
                angular.forEach(cols, function(col){
                    cellData.push(col);
                });
                // Don't add an empty row at the beginning or end
                if(cellData.length > 1 || cellData[0] !== '')
                    rows.push(cellData);
            });
        } else {
            // Create empty columns
            for(var i=0; i<$scope.editor.cols; i++)
                cols.push('');
            // Create rows with columns
            for(var i=0; i<$scope.editor.rows; i++)
                rows.push(cols);
        }
        
        Page.extras[timestamp] = angular.toJson(rows);
        
        document.execCommand('insertHTML', false, '<div cosmo-table="'+ timestamp +'"></div>');
        ngDialog.close();
        $rootScope.$broadcast('saveAndRefresh');
    };
    
}])

.directive('wysiwyg', ['ngDialog', '$rootScope', 'Page', '$compile', '$timeout', function(ngDialog, $rootScope, Page, $compile, $timeout){
    return {
        templateUrl: 'core/html/wysiwyg/toolbar.html',
        replace: true,
        scope: {},
        link: function(scope, elm, attr){
            
            scope.editor = {};
            scope.editor.codeEditor = false;
            scope.editor.showToolbar = false;
            scope.editor.tableRows = [];
            Page.misc.wysiwyg = {};
            
            // Populate 100 table rows
            for(var i=1; i<=10; i++){
                for(var j=1; j<=10; j++){
                    scope.editor.tableRows.push({row: i, col: j});
                }
            }
            
            // Keep track of which cell the user moused over to create a new table
            scope.cellMouseover = function(row, col){
                scope.mouseoverRow = row;
                scope.mouseoverCol = col;
            };
            
            // Check if the cell is active for the table creator
            scope.selectedCell = function(row, col){
                if(scope.mouseoverRow >= row && scope.mouseoverCol >= col)
                    return true;
                else
                    return false;
            };
            
            // Insert the table into the page
            scope.createTable = function(row, col){
                var tempRows = [];
                var tempCols = [];
                for(i=0; i<col; i++)
                    tempCols.push('');
                for(i=0; i<row; i++)
                    tempRows.push(tempCols);
                var tempTimestamp = new Date().getTime();
                Page.extras[tempTimestamp] = tempRows;
                document.execCommand('insertHTML', false, '<table cosmo-table="'+ tempTimestamp +'"></table>');
                $rootScope.$broadcast('saveAndRefresh');
            };
            
            // Turn the toolbar on and position it just above the mouse click
            scope.$on('activateWYSIWYG', function(event, data){
                // Wait for the next digest cycle in case user clicked from another editable div. 
                // Focusout from one editable div closes the toolbar.
                $timeout(function(){
                    scope.editor.showToolbar = true;
                });
                var remX = (data.pageX / 10) - 16; // -16 centers toolbar
                var remY = (data.pageY / 10); // Go directly above click. CSS margin pushes this above mouse
                
                // Make sure the toolbar isn't too far to the left (where it cuts off toolbar items)
                if((data.pageX - 150) < 0)
                    remX = 0;
                
                // Make sure the toolbar isn't too far to the right (where it cuts off toolbar items)
                if((data.pageX + 250) > window.innerWidth)
                    remX = (window.innerWidth - 400) / 10;
                
                // Make sure the toolbar isn't too far down (where it cuts off the dropdowns)
                if((data.clientY + 100) > window.innerHeight)
                    remY = (data.pageY - 100) / 10;
                
                console.log(data);
                elm.css('top', remY + 'rem');
                elm.css('left', remX + 'rem');
            });
            
            // Hide the toolbar
            scope.$on('hideWYSIWYG', function(){
                scope.editor.showToolbar = false;
            });
            
            function parseTable(){
                var html = elm.contents()[3].innerHTML;
                var loc = scope.editor.focusLocation;
                var nextLoc = 0;
                while(nextLoc < loc && nextLoc !== -1){
                    var tableLoc = html.indexOf('<table>', nextLoc);
                    nextLoc = tableLoc;
                };
            };
            
            // User clicked a button on the toolbar
            scope.action = function(action){
                
                switch(action){
                    case 'bold':
                        document.execCommand('bold',false,null);
                        break;
                    case 'italic':
                        document.execCommand('italic',false,null);
                        break;
                    case 'strikethrough':
                        document.execCommand('strikethrough',false,null);
                        break;
                    case 'underline':
                        document.execCommand('underline',false,null);
                        break;
                    case 'link':
                        var url = prompt("URL:");
                        if(url)
                            document.execCommand('insertHTML', false, '<a href="'+ url +'">'+ window.getSelection().toString() +'</a>');
                        break;
                    case 'externalLink':
                        var url = prompt("URL:");
                        if(url)
                            document.execCommand('insertHTML', false, '<a href="'+ url +'" target="_blank">'+ window.getSelection().toString() +'</a>');
                        break;
                    case 'unlink':
                        document.execCommand('unlink',false,null);
                        break;
                    case 'ol':
                        document.execCommand('insertOrderedList',false,null);
                        break;
                    case 'ul':
                        document.execCommand('insertUnorderedList',false,null);
                        break;
                    case 'indent':
                        document.execCommand('indent',false,null);
                        break;
                    case 'outdent':
                        document.execCommand('outdent',false,null);
                        break;
                    case 'left':
                        document.execCommand('justifyLeft',false,null);
                        break;
                    case 'right':
                        document.execCommand('justifyRight',false,null);
                        break;
                    case 'center':
                        document.execCommand('justifyCenter',false,null);
                        break;
                    case 'hr':
                        document.execCommand('insertHorizontalRule',false,null);
                        break;
                    case 'h1':
                        document.execCommand('formatBlock',false,'<h1>');
                        break;
                    case 'h2':
                        document.execCommand('formatBlock',false,'<h2>');
                        break;
                    case 'h3':
                        document.execCommand('formatBlock',false,'<h3>');
                        break;
                    case 'h4':
                        document.execCommand('formatBlock',false,'<h4>');
                        break;
                    case 'h5':
                        document.execCommand('formatBlock',false,'<h5>');
                        break;
                    case 'h6':
                        document.execCommand('formatBlock',false,'<h6>');
                        break;
                    case 'p':
                        document.execCommand('formatBlock',false,'<p>');
                        break;
                    case 'code':
                        document.execCommand('insertHTML', false, '<code>'+ window.getSelection().toString() +'</code>');
                        break;
                    case 'blockquote':
                        document.execCommand('formatBlock',false,'<blockquote>');
                        break;
                    case 'unformat':
                        // alternative? to remove header tags and others
                        // document.execCommand('insertHTML', false, getSelection().replace(/<[^<]+?>/g, ''));
                        document.execCommand('removeFormat',false,null);
                        break;
                    case 'addTableHeader':
                        $rootScope.$broadcast('addTableHeader', Math.round(new Date().getTime()/1000));
                        break;
                    case 'removeTableHeader':
                        $rootScope.$broadcast('removeTableHeader', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addRowAbove':
                        $rootScope.$broadcast('addRowAbove', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addRowBelow':
                        $rootScope.$broadcast('addRowBelow', Math.round(new Date().getTime()/1000));
                        break;
                    case 'deleteRow':
                        $rootScope.$broadcast('deleteRow', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addColRight':
                        $rootScope.$broadcast('addColRight', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addColLeft':
                        $rootScope.$broadcast('addColLeft', Math.round(new Date().getTime()/1000));
                        break;
                    case 'deleteCol':
                        $rootScope.$broadcast('deleteCol', Math.round(new Date().getTime()/1000));
                        break;
                    case 'deleteTable':
                        $rootScope.$broadcast('deleteTable', Math.round(new Date().getTime()/1000));
                        break;
                    case 'table':
                        var table = prompt("Paste tab-separated-values:");
                        if(table) {
                            var timestamp = new Date().getTime();
                            var rows = [];
                            var cols = [];
                            
                            var pastedTableRows = table.split("\n");
                            // Iterate through each row
                            angular.forEach(pastedTableRows, function(row){
                                var cellData = [];
                                var cols = row.split("\t");
                                // Iterate through each column
                                angular.forEach(cols, function(col){
                                    cellData.push(col);
                                });
                                // Don't add an empty row at the beginning or end
                                if(cellData.length > 1 || cellData[0] !== '')
                                    rows.push(cellData);
                            });
                            Page.extras[timestamp] = angular.toJson(rows);
                            document.execCommand('insertHTML', false, '<div cosmo-table="'+ timestamp +'"></div>');
                            $rootScope.$broadcast('saveAndRefresh');
                        }
                        break;
                    case 'photo':
                        document.execCommand('insertHTML', false, '<div image="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'bgimage':
                        document.execCommand('insertHTML', false, '<div bgimage="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'audio':
                        document.execCommand('insertHTML', false, '<div audio="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'video':
                        document.execCommand('insertHTML', false, '<div movie="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'gallery':
                        document.execCommand('insertHTML', false, '<img gallery="'+ new Date().getTime() +'"></img>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'div':
                        var classes = prompt("CSS classes:");
                        if(classes)
                            document.execCommand('insertHTML', false, '<div class="'+ classes +'"></div>');
                        break;
                    case 'custom':
                        var directive = prompt("Directive:");
                        if(directive)
                            document.execCommand('insertHTML', false, '<div '+ directive +'></div>');
                        break;
                    case 'toggle':
                        var toggle = true;
                        $rootScope.$broadcast('toggleHTMLEditor');
                        break;
                        
                    default:
                        break;
                }
                if(!toggle)
                    $rootScope.$broadcast('saveAndRefresh');
            };
        }
    };
}])

.filter('imageSize', function(){
    return function(input, quality){
        if(input && quality){
            input = input.toString(); // In case of $sce.trustAsUrl()
            if(input.indexOf('http') !== 0 && input.indexOf('//') !== 0)
                return input.replace(/\./, '-' + quality + '.');
            else
                return input;
        } else
            return input;
    };
})

// Unix timestamp to date filter
.filter('timestamp', function() {
    return function(input) {
        var date = new Date(input * 1000);
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();

        return month + '/' + day + '/' + year;
    };
})


/****************************************************************************************************
 *                                             Controllers                                          *
 ****************************************************************************************************/



/**************************************************
 *             Admin Panel Controller             *
 **************************************************/

.controller('adminPanelCtrl', ['$scope', 'Users', 'REST', function($scope, Users, REST){
    
    $scope.admin = {};
    $scope.admin.sidebar = 'core/html/sidebar.html';
    $scope.admin.username = Users.username;
    
    REST.users.get({userID: Users.id}, function(data){
        if(data.photo)
            $scope.admin.photo = data.photo;
        else
            $scope.admin.photo = 'img/image.svg';
    });
    
    $scope.sidebar = '';
    $scope.showAdminPanel = false; // Initialize sidebar as hidden
    
    // todo: Depreciate. Remove from admin-panel.html and use loginRegistrationCtrl instead
    $scope.logout = function(){
        // Delete cookies
        document.cookie = 'username=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'token=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        location.reload(); // Refresh the page
    };
}])

/**************************************************
 *             Block Controller                   *
 **************************************************/

.controller('blockCtrl', ['$scope', 'REST', 'growl', 'Page', '$rootScope', function($scope, REST, growl, Page, $rootScope){
    
    var lastClicked;
    $scope.block = {};
    $scope.block.panel = 'manage';
    $scope.types = [];
    $scope.block.selectedTypes = {};
    
    // Get all available blocks
    REST.blocks.query({}, function(data){
        $scope.blocks = data;
    });
    
    // Get the page types available
    REST.themes.query({ themeID: Page.theme }, function(data){
        angular.forEach(data, function(data2){
            if(data2.type)
                $scope.types.push(data2.type);
        });
    });
    
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
        REST.blocksRequirements.query({ blockID: $scope.block.id }, function(data){
            var blockURLs = '';
            angular.forEach(data, function(data2){
                if(data2.type === 'visible' || data2.type === 'invisible'){
                    $scope.block.visibility = data2.type;
                    blockURLs += data2.requirement + "\n";
                } else {
                    if(data2.type)
                        $scope.block.selectedTypes[data2.type] = true;
                }
            });
            $scope.block.urls = blockURLs;
        });
    };
    
    // Add a new block
    $scope.newBlock = function(){
        REST.blocks.save({ name: $scope.block.newName }, function(data){
            if($scope.blocks)
                $scope.blocks.push({ id: data.data, name: $scope.block.newName });
            else
                $scope.blocks = [{ id: data.data, name: $scope.block.newName }];
            
            $scope.block.newName = '';
            growl.addSuccessMessage("New Block Added");
        });
    };
    
    // Delete block
    $scope.deleteBlock = function(){
        REST.blocks.delete({ blockID: $scope.block.id }, function(data){
            if(data){
                for(var i=0; i< $scope.blocks.length; i++){
                    if($scope.blocks[i]['id'] === $scope.block.id)
                        $scope.blocks.splice(i,1);
                }
                $scope.block.name = '';
                growl.addSuccessMessage("Block Deleted");
            }
        });
    };
    
    // Update block section/priority from the overview section
    $scope.updateBlock = function(block){
        REST.blocks.update({ 
            blockID: block.id, 
            name: block.name, 
            block: block.block, 
            area: block.area, 
            priority: parseInt(block.priority) 
        }, function(data){
            growl.addSuccessMessage("Block Updated");
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
        }, function(data){
            
            // Update block name in CMS
            for(var i=0; i< $scope.blocks.length; i++){
                if($scope.blocks[i]['id'] === $scope.block.id)
                    $scope.blocks[i]['name'] = $scope.block.name;
            }
            
            // Delete old visibility requirements
            REST.blocksRequirements.delete({ blockID: $scope.block.id }, function(){
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
                        });
                    }
                });
            });
            
            // Update page object
            Page.blocks.push({
                name: $scope.block.name, 
                block: $scope.block.html,
                area: $scope.block.area, 
                priority: $scope.block.priority
            });
            growl.addSuccessMessage("Block Updated");
            $rootScope.$broadcast('blocksGet');
        });
    };
}])

/**************************************************
 *          Content List Controller               *
 **************************************************/

.controller('contentListCtrl', ['$scope', 'REST', function($scope, REST){
    
    $scope.search = {};
    $scope.content = {};
    
    // Search
    $scope.searchBar = function(){
        switch($scope.content.onlySearch){
            case 'type':
                $scope.search.type = $scope.content.input;
                break;
            case 'author':
                $scope.search.author = $scope.content.input;
                break;
            case 'tags':
                $scope.search.tags = $scope.content.input;
                break;
            
            default:
                $scope.search.title = $scope.content.input;
                break;
        }
    };
    
    // Fetch content
    REST.content.query({}, function(data){
        $scope.pages = data;
    });
}])

/**************************************************
 *              File Controller                   *
 **************************************************/

.controller('filesCtrl', ['$scope', '$upload', 'REST', '$rootScope', '$sce', 'ngDialog', 'growl', 'Hooks', 'Responsive', function($scope, $upload, REST, $rootScope, $sce, ngDialog, growl, Hooks, Responsive){
    
    $scope.files = {};
    $scope.files.classes = '';
    $scope.files.size = 'responsive';
    $scope.numFiles = 12;
    
    // Open modal window
    if($scope.$parent.ngDialogData.gallery){
        $scope.images = $scope.$parent.ngDialogData.images;
        for(var i=0; i<$scope.images.length; i++)
            $scope.images[i].url = $sce.trustAsResourceUrl($scope.images[i].url);
        $scope.files.gallery = true;
        $scope.editingGallery = true;
    }else {
        $scope.files.gallery = false;
        $scope.editingGallery = false;
    }
    
    $scope.id = $scope.$parent.ngDialogData.id;
    
    // Get files for the media library
    function getFiles(justUploaded){
        
        REST.files.query({}, function(data){
            $scope.media = [];
            angular.forEach(data, function(value){
                // Don't do anything to an image that was just uploaded (so modules don't cache images that haven't been uploaded yet)
                if(justUploaded && data[0]===value)
                    var filename = value.filename;
                else {
                    if(value.responsive==='yes')
                        var filename = Hooks.imageHookNotify(Responsive.resize(value.filename, 'small'));
                    else
                        var filename = Hooks.imageHookNotify(value.filename);
                }
                
                $scope.media.push({
                    alt: value.alt,
                    class: value.class,
                    filename: $sce.trustAsResourceUrl(filename),
                    origFilename: value.filename,
                    href: value.href,
                    id: value.id,
                    title: value.title,
                    tags: value.tags,
                    type: value.type,
                    responsive: value.responsive
                });
            });
            
            if(justUploaded){
                $scope.viewFile($scope.media[0]);
                $rootScope.$broadcast('imageSaved', data[0]);
            }
        });
    }
    getFiles();
    
    // Autocomplete tags
    $scope.autocompleteTags = function(){
        var tag = $scope.files.tags[$scope.files.tags.length - 1];
        if(tag){
            REST.filesTags.query({ tag: tag }, function(data){
                $scope.files.suggestions = data;
            }, function(){ // error
                $scope.files.suggestions = [];
            });
        } else 
            $scope.files.suggestions = [];
    };
    
    // Select tag from autocomplete
    $scope.selectSuggestion = function(tag){
        var tags = angular.copy($scope.files.tags);
        tags[tags.length - 1] = tag;
        tags[tags.length] = '';
        $scope.files.tags = tags;
        $scope.files.suggestions = [];
    };
    
    // Upload files
    $scope.onFileSelect = function($files) {
        //$files: an array of files selected, each file has name, size, and type.
        for (var i = 0; i < $files.length; i++) {
            var $file = $files[i];
            $scope.upload = $upload.upload({
                url: 'api/files', //upload.php script, node.js route, or servlet url
                method: 'POST',
                // headers: {'headerKey': 'headerValue'}, withCredential: true,
                data: {myObj: $scope.myModelObj},
                file: $file,
                //(optional) set 'Content-Desposition' formData name for file
                //fileFormDataName: myFile,
                progress: function(evt) {
                    
                }
            }).progress(function(evt) {
                $scope.progress = parseInt(100.0 * evt.loaded / evt.total) + '% Uploaded';
            }).success(function(data, status, headers, config) {
                // file is uploaded successfully
                getFiles(true);
                $scope.upload = false;
                $rootScope.$broadcast('fileUploaded', data);
            });
        }
    };
    
    $scope.uploadFromUrl = function(){
        REST.files.save({ file: $scope.files.uploadURL }, function(){
            getFiles(true);
            $scope.upload = false;
        });
    };
    
    // Update the image viewer
    $scope.updateCurrentImage = function(){
        // Check if coming from a gallery
        if(!$scope.media[$scope.currentIndex].filename)
           $scope.media[$scope.currentIndex].filename = $scope.media[$scope.currentIndex].url;
        
        $scope.selectedId = $scope.media[$scope.currentIndex].id;
        $scope.selectedFile = $scope.media[$scope.currentIndex].filename;
        $scope.origFilename = $scope.media[$scope.currentIndex].origFilename;
        $scope.files.title = $scope.media[$scope.currentIndex].title;
        $scope.files.href = $scope.media[$scope.currentIndex].href;
        $scope.files.alt = $scope.media[$scope.currentIndex].alt;
        $scope.files.class = $scope.media[$scope.currentIndex].class;
        $scope.files.tags = $scope.media[$scope.currentIndex].tags;
        $scope.files.type = $scope.media[$scope.currentIndex].type;
        $scope.files.responsive = $scope.media[$scope.currentIndex].responsive;
    };
    
    // View this media info
    $scope.viewFile = function(file, index){
        $scope.selectedId = file.id;
        $scope.selectedFile = file.filename;
        $scope.origFilename = file.origFilename;
        $scope.files.title = file.title;
        $scope.files.href = file.href;
        $scope.files.alt = file.alt;
        $scope.files.class = file.class;
        $scope.files.tags = file.tags;
        $scope.files.type = file.type;
        $scope.files.responsive = file.responsive;
        
        $scope.currentIndex = index;
        // $scope.updateCurrentImage();
    };
    
    // Go to the previous image/media item
    $scope.prev = function(){
        $scope.currentIndex = $scope.currentIndex-1;
        $scope.updateCurrentImage();
    };
    
    // Go to the next image/media item
    $scope.next = function(){
        $scope.currentIndex++;
        $scope.updateCurrentImage();
    };
    
    // Save title/tags to the file
    $scope.save = function(){
        // Save file elements
        REST.files.update({
            fileID: $scope.selectedId,
            title: $scope.files.title,
            href: $scope.files.href,
            alt: $scope.files.alt,
            class: $scope.files.class
        }, function(data){
            growl.addSuccessMessage("File Updated");
        });
        
        // Delete old tags
        REST.filesTags.delete({ fileID: $scope.selectedId });
        
        // Save file tags
        angular.forEach($scope.files.tags, function(tag){
            REST.filesTags.save({ fileID: $scope.selectedId, tag: tag });
        });
        
        // Update gallery if applicable
        angular.forEach($scope.images, function(image, key){
            if(parseInt(image.id) === parseInt($scope.selectedId)){
                $scope.images[key].title = $scope.files.title;
                $scope.images[key].href = $scope.files.href;
                $scope.images[key].alt = $scope.files.alt;
                $scope.images[key].class = $scope.files.class;
                $scope.images[key].tags = $scope.files.tags;
            }
        });
    };
    
    // Delete file
    $scope.deleteFile = function(){
        REST.files.delete({
            fileID: $scope.selectedId
        }, function(data){
            $scope.selectedFile = '';
            getFiles();
        });
    };
    
    // Save image gallery
    $scope.saveGallery = function(){
        $rootScope.$broadcast('choseGalleryFile', { id: $scope.id, data: $scope.images });
        ngDialog.close();
    };
    
    // Select media
    $scope.selectFile = function(){
        if($scope.editingGallery){
            $scope.files.gallery = true;
            $scope.images.push({ 
                id: $scope.selectedId,
                title: $scope.files.title,
                alt: $scope.files.alt,
                src: $scope.origFilename,
                href: $scope.files.href,
                class: $scope.files.classes,
                tags: $scope.files.tags,
                type: $scope.files.type,
                size: $scope.files.size,
                responsive: $scope.files.responsive,
                url: $scope.origFilename
            });
        } else {
            $rootScope.$broadcast('choseFile', { 
                id: $scope.id,
                title: $scope.files.title,
                alt: $scope.files.alt,
                src: $scope.origFilename,
                href: $scope.files.href,
                class: $scope.files.classes,
                size: $scope.files.size,
                responsive: $scope.files.responsive
            });
            ngDialog.close();
        }
    };
    
}])

/**************************************************
 *              Menu Controller                   *
 **************************************************/

.controller('menuCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    var lastClicked;
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
            growl.addSuccessMessage('Menu Created', { classes: 'cosmo-default' });
        });
    };
    
    // Edit a menu's name
    $scope.updateMenuName = function(){
        REST.menus.update({ menuID: $scope.menu.id, name: $scope.menu.name, menu: $scope.menu.menu, area: $scope.menu.area }, function(data){
            if(data){
                for(var i=0; i< $scope.menus.length; i++){
                    if($scope.menus[i]['id'] === $scope.menu.id)
                        $scope.menus[i]['name'] = $scope.menu.name;
                }
                $scope.menu.name = '';
            }
        });
    };
    
    // Delete menu
    $scope.deleteMenu = function(){
        REST.menus.delete({ menuID: $scope.menu.id }, function(data){
            if(data){
                for(var i=0; i< $scope.menus.length; i++){
                    if($scope.menus[i]['id'] === $scope.menu.id)
                        $scope.menus.splice(i,1);
                }
                $scope.menu.name = '';
                growl.addErrorMessage('Menu Deleted', { classes: 'cosmo-default' });
            }
        });
    };
    
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
        REST.menus.update({ menuID: $scope.menu.id, name: $scope.menu.name, menu: angular.toJson($scope.list), area: $scope.menu.area }, function(data){
            growl.addSuccessMessage("Menu Saved", { classes: 'cosmo-default' });
        });
    };
}])

/**************************************************
 *              Module Controller                 *
 **************************************************/

.controller('moduleCtrl', ['$scope', 'REST', 'growl', '$http', function($scope, REST, growl, $http){
    
    // Get modules
    REST.modules.query({}, function(data){
        $scope.modules = data;
    });
    
    // Install Module
    $scope.install = function(module, index){
        REST.modules.save({ module: module }, function(data){
            $scope.modules[index]['status'] = 'active';
            
            // Check for an installation file and run it
            if($scope.modules[index]['install'])
                $http.get('modules/'+ module +'/'+ $scope.modules[index]['install']);
            
            // Success Message
            growl.addSuccessMessage('Module Installed');
        });
    };
    
    // Uninstall Module
    $scope.uninstall = function(moduleID, index){
        REST.modules.delete({ moduleID: moduleID }, function(data){
            // Check for an uninstallation file and run it
            if($scope.modules[index]['uninstall'])
                $http.get('modules'+ $scope.modules[index]['folder'] +'/'+ $scope.modules[index]['uninstall']);
            
            // Remove module from sidebar
            $scope.modules[index] = null;
            
            // Success Message
            growl.addSuccessMessage('Module Uninstalled');
        });
    };
    
    // Activate Module
    $scope.activate = function(moduleID, index){
        REST.modules.update({ moduleID: moduleID, status: 'active' }, function(data){
            $scope.modules[index]['status'] = 'active';
            
            // Success Message
            growl.addSuccessMessage('Module Activated');
        });
    };
    
    // Deactivate Module
    $scope.deactivate = function(moduleID, index){
        REST.modules.update({ moduleID: moduleID, status: 'inactive' }, function(data){
            $scope.modules[index]['status'] = 'inactive';
            
            // Success Message
            growl.addSuccessMessage('Module Deactivated');
        });
    };
    
    // Go to a module's settings
    $scope.goToSettings = function(folder, file){
        $scope.settingsFile = 'modules/'+ folder +'/'+ file;
    };
    
}])

/**************************************************
 *              Page Controller                   *
 **************************************************/

.controller('pageCtrl', ['$scope', 'REST', '$location', 'Page', '$rootScope', 'growl', '$routeParams', '$upload', 'Users', function($scope, REST, $location, Page, $rootScope, growl, $routeParams, $upload, Users){
    
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
        $scope.page.scheduleDate = Math.round(+new Date()/1000);
    
    // Initialize schedule date
    var date = new Date($scope.page.scheduleDate * 1000);
    var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    var ampm = date.getHours() > 12 ? 'PM' : 'AM';
    var formattedDate = date.getMonth() + 1 +'/'+ date.getDate() +'/'+ date.getFullYear() +' '+ hours +':'+ date.getMinutes() +' '+ ampm;
    $scope.page.scheduleDate = formattedDate;
    
    // Get the pages available to this theme
    REST.themes.query({ themeID: Page.theme }, function(data){
        var index = 0;
        for(var i=0; i<data.length; i++){
            if(data[i].type){
                $scope.page.themePages.push({ name: data[i].type});
                if(data[i].type === Page.type)
                    index = i;
            }
        }
        $scope.page.type = $scope.page.themePages[index];
    });
    
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
        REST.content.delete({ contentID: $scope.page.id }, function(data){
            // Success message
            growl.addSuccessMessage("Deleted");
        });
        
        // Delete all revisions of this page
        REST.contentRevisions.delete({ contentID: $scope.page.id });
        
        // Delte all extra revisions
        REST.contentRevisionsExtras.delete({ contentID: $scope.page.id });
        
        // Delete all extras from this page
        REST.contentExtras.delete({ contentID: $scope.page.id });
        
        // Delete all tags for this page
        REST.contentTags.delete({ contentID: $scope.page.id });
        
        $location.path('new');
    };
    
    // Watch for page change
    var updatePage = function() {
        $scope.page.title = Page.title;
        $scope.page.description = Page.description;
        $scope.page.url = Page.url;
        if($scope.page.type)
            $scope.page.type.name = Page.type;
        $scope.page.tags = Page.tags;
    };
    updatePage();
    
    $scope.$on('contentGet', function(){
        updatePage();
    });
    
    // Update the page type
    $scope.updatePageType = function(){
        Page.type = $scope.page.type.name;
        $rootScope.$broadcast('settingsGet');
    };
    
    // Auto-generate the url from the title
    $scope.titleChange = function(){
        
        // Log changes to the Page object
        Page.title = $scope.page.title;
        
        // Only auto-generate urls for new pages
        if($scope.page.url === '/new' || $scope.page.url === '')
            $scope.autoURL = true;
        
        if($scope.autoURL){
            // Change spaces to hyphens, convert to lowercase, and remove punctuation
            $scope.page.url = $scope.page.title.toLowerCase().replace(/ /g, '-').replace(/[\.,\/#!$%\^&\*;:{}=_'~()]/g, '');
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
        Page.type = $scope.page.type.name;
        
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
        if(duplicate && $scope.page.url === Page.url){
            growl.addErrorMessage('Error: URL must be different to duplicate a page');
            return;
        }
        
        // Make sure there is a page type
        if(!$scope.page.type.name){
            growl.addErrorMessage('No page type selected');
            return;
        }
        
        // If there's no custom title tag, use the header
        if($scope.page.title){
            if($scope.page.title.length === 0)
                $scope.page.title = Page.header;
        }
        
        // If there's no custom url, use the title
        if($scope.page.url.length === 0 || $scope.page.url === '/new'){
            var title = $scope.page.title.replace(/ /g, '-').toLowerCase;
            $scope.page.url = title;
        }
        
        // Get the scheduled date to publish
        var scheduleDate;
        if($scope.page.publish === 'Y' && Page.publish === 'Y') // If this was already published, don't update the published date
            scheduleDate = Page.scheduleDate;
        else if($scope.page.publish === 'Y') // If publishing now, set the publish date to the current time
            scheduleDate = Math.round(+new Date()/1000);
        else if($scope.page.publish === 'schedule'){
            scheduleDate = Date.parse($scope.page.scheduleDate)/1000;
            // Check if this is back dated
            if(Date.parse($scope.page.scheduleDate) < Math.round(+new Date()))
                $scope.page.publish = 'Y';
            else
                $scope.page.publish = 'N';
        }
        
        // Create a new page or a duplicate
        if($location.path() === '/new' || duplicate){
            
            // Save content
            REST.content.save({
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header, 
                subheader: Page.subheader, 
                body: Page.body,
                url: $scope.page.url, 
                type: $scope.page.type.name,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: Users.username
            }, function(data){
                var contentID = data.id;
                
                // Reset variables to edit page instead of create a new page
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
                    body: Page.body,
                    url: $scope.page.url, 
                    type: $scope.page.type.name,
                    published: $scope.page.publish,
                    published_date: scheduleDate,
                    author: Users.username
                }, function(data){
                    revisionID = data.id;
                    var i = 1;
                    
                    // Save additional data if there is any
                    if(Object.keys(Page.extras).length === 0){
                        // Success message
                        growl.addSuccessMessage("Saved", { classes: 'cosmo-growl-item message' });
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
                            }, function(){
                                // Wait for the last extra to be saved, then redirect the user
                                if(i === Object.keys(Page.extras).length){
                                    // Success message
                                    growl.addSuccessMessage("Saved", { classes: 'cosmo-growl-item message' });
                                    // Redirect to new page
                                    $location.path($scope.page.url);
                                } else
                                    i++;
                            }, function(){
                                // Wait for the last extra to be saved, then redirect the user
                                if(i === Object.keys(Page.extras).length){
                                    // Success message
                                    growl.addSuccessMessage("Saved", { classes: 'cosmo-growl-item message' });
                                    // Redirect to new page
                                    $location.path($scope.page.url);
                                } else
                                    i++;
                            });
                            
                            // Save extra to revisions
                            REST.contentRevisionsExtras.save({
                                revisionID: revisionID,
                                contentID: contentID,
                                name: key,
                                extra: Page.extras[key]
                            });
                        };
                    }
                });
            }, function(){ // Error
                growl.addErrorMessage('Error saving page. Possible duplicate URL');
            });
        } else { // Update existing page
            
            var revisionID;
            
            REST.content.update({
                contentID: $scope.page.id,
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header, 
                subheader: Page.subheader, 
                body: Page.body,
                url: $scope.page.url, 
                type: $scope.page.type.name,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: Users.username
            }, function(data){
                
                // Delete old tags
                REST.contentTags.delete({ contentID: $scope.page.id }, function(){
                    // Save new tags
                    angular.forEach($scope.page.tags, function(value){
                        REST.contentTags.save({ contentID: $scope.page.id, tag: value });
                    });
                });
                
                // Save page as a revision
                REST.contentRevisions.save({
                    contentID: $scope.page.id,
                    title: $scope.page.title,
                    description: $scope.page.description,
                    header: Page.header, 
                    subheader: Page.subheader, 
                    body: Page.body,
                    url: $scope.page.url, 
                    type: $scope.page.type.name,
                    published: $scope.page.publish,
                    published_date: $scope.page.scheduleDate,
                    author: Users.username
                }, function(data){
                    revisionID = data.id;
                    var i = 1;
                    
                    // Delete old extras
                    REST.contentExtras.delete({ contentID: $scope.page.id }, function(){
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
                                }, function(){
                                    // Wait for the last extra to be saved, then redirect the user
                                    if(i === Object.keys(Page.extras).length){
                                        // Success message
                                        growl.addSuccessMessage("Page Updated", { classes: 'cosmo-growl-item message' });
                                        // Redirect to new page
                                        $location.path($scope.page.url);
                                    } else
                                        i++;
                                }, function(){
                                    // Wait for the last extra to be saved, then redirect the user
                                    if(i === Object.keys(Page.extras).length){
                                        // Success message
                                        growl.addSuccessMessage("Page Updated", { classes: 'cosmo-growl-item message' });
                                        // Redirect to new page
                                        $location.path($scope.page.url);
                                    } else
                                        i++;
                                });
                                
                                // Save new extra to revisions
                                REST.contentRevisionsExtras.save({
                                    revisionID: revisionID,
                                    contentID: $scope.page.id,
                                    name: key,
                                    extra: Page.extras[key]
                                });
                            }
                        }
                    });
                });
            }, function(data){ // Error
                console.log(data);
                growl.addErrorMessage('Error updating page');
            });
        }
        
    };
}])


/**************************************************
 *              Profile Controller                *
 **************************************************/

.controller('profileCtrl', ['$scope', 'REST', 'growl', 'ngDialog', 'Users', function($scope, REST, growl, ngDialog, Users){
    
    // Initialize variables
    $scope.profile = {};
    
    // Get the User's profile photo
    REST.users.get({userID: Users.id}, function(data){
        $scope.profile = data;
        if(!$scope.profile.photo)
            $scope.profile.photo = 'img/image.svg'; // Placeholder image
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
            username: $scope.profile.username,
            photo: $scope.profile.photo,
            facebook: $scope.profile.facebook,
            twitter: $scope.profile.twitter,
            role: $scope.profile.role,
            email: $scope.profile.email
        }, function(){
            growl.addSuccessMessage('Profile info updated');
        });
    };
    
}])

/**************************************************
 *            Revisions Controller                *
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
            growl.addSuccessMessage("Content has been revised");
        });
    };
    
}])

/**************************************************
 *             Settings Controller                *
 **************************************************/
 
.controller('settingsCtrl', ['$scope', 'REST', 'growl', 'Page', 'ngDialog', function($scope, REST, growl, Page, ngDialog){
    
    $scope.settings = {};
    $scope.settings.siteName = Page.settings.site_name;
    $scope.settings.logo = Page.settings.logo;
    $scope.settings.favicon = Page.settings.favicon;
    $scope.settings.slogan = Page.settings.slogan;
    $scope.settings.email = Page.settings.email;
    $scope.settings.maintenanceURL = Page.settings.maintenance_url;
    if(Page.settings.maintenance_mode)
        $scope.settings.maintenanceMode = true;
    
    // Default if no custom images were set
    if(!$scope.settings.logo)
        $scope.settings.logo = 'img/image.svg';
    if(!$scope.settings.favicon)
        $scope.settings.favicon = 'img/image.svg';
    
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
    
    // Save settings
    $scope.changeSettings = function(){
        REST.settings.update({ 
            siteName: $scope.settings.siteName, 
            slogan: $scope.settings.slogan,
            logo: $scope.settings.logo,
            favicon: $scope.settings.favicon,
            email: $scope.settings.email,
            maintenanceURL: $scope.settings.maintenanceURL,
            maintenanceMode: $scope.settings.maintenanceMode
        }, function(data){
            growl.addSuccessMessage("Settings Updated");
        });
    };
    
}])

/**************************************************
 *              Tags Controller                   *
 **************************************************/

.controller('tagsCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    $scope.tags = {};
    $scope.tags.tags = [];
    
    // Get all available menus
    $scope.getTags = function(){
        REST.filesTags.query({}, function(data){
            $scope.tags.tags = data;
        });
    };
    $scope.getTags();
    
    // Edit a menu's name
    $scope.updateTag = function(){
        REST.filesTags.update({ tag: $scope.tags.selectedTags, newTag: $scope.tags.newTag }, function(data){
            $scope.getTags();
        });
    };
    
    // Delete menu
    $scope.deleteTag = function(){
        $scope.tags.selectedTag;
        $scope.tags.newTag;
        REST.filesTags.delete({ tag: $scope.tags.selectedTag }, function(data){
            $scope.getTags();
        });
    };
    
}])

/**************************************************
 *              Themes Controller                 *
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
 **************************************************/

.controller('usersCtrl', ['$scope', 'REST', 'growl', 'ngDialog', function($scope, REST, growl, ngDialog){
    
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
        }, function(){
            growl.addSuccessMessage('User info updated');
        });
    };
    
    // Delete user
    $scope.delete = function(){
        // Delete user
        REST.users.delete({ userID: $scope.selectedUser.id }, function(){
            // Show success message
            growl.addSuccessMessage('User Deleted');
        }, function(){
            // Show error message
            growl.addErrorMessage('Error Deleting User');
        });
    };
    
}])











/****************************************************************************************************
 *                                              Directives                                          *
 ****************************************************************************************************/



/**************************************************
 *           Admin Panel Directive                *
 **************************************************/

.directive('adminpanel', function(){
    return {
        templateUrl: 'core/html/admin-panel.html'
    };
})





/****************************************************************************************************
 *                                           Filters                                                *
 ****************************************************************************************************/




// Format theme html files into user-friendly page options
.filter('themeFiles', function(){
    return function(input){
        
        if(input){
            // Remove .html extension
            var output = input.replace(/\.html/g,' ');
            // Replace hyphens with spaces
            output = output.replace(/\-/g,' ');
            // Capitalize the first letter of every word
            output = output.replace(/\b./g, function(m){ return m.toUpperCase(); });

            return output;
        } else
            return input;
    };
});