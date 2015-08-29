/**************************************************
 *             Content Directive                  *
 *        Content directive for headers,          *
 *          subheaders, body, etc.                *
 **************************************************/

angular.module('cosmo').directive('csContent', ['Page', '$routeParams', '$sce', '$rootScope', '$compile', 'Users', 'Hooks', function(Page, $routeParams, $sce, $rootScope, $compile, Users, Hooks) {
    return {
        priority: 100,
        link: function(scope, elm, attrs, ctrl) {

            scope.editor = {};
            scope.editor.codeEditor = false;

            var updateCosmo = function(){

                if(Page[attrs.csContent])
                    var content = Page[attrs.csContent];
                else if(Page.extras[attrs.csContent])
                    var content = Page.extras[attrs.csContent];
                else if(attrs.prepopulate && Users.admin)
                    var content = attrs.prepopulate;
                else
                    var content = ' ';

                if(content)
                    content = content.toString();

                // Remove HTML tags if this is a text only area
                if(attrs.type === 'text')
                    content = content.replace(/<[^<]+?>/g, '');

                // Pass content to Hooks first
                content = Hooks.contentHookNotify(content);

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
                scope.currentBlock = attrs.csContent;
                if(attrs.type !== 'text' && (!event.srcElement.attributes['cs-type'] || event.srcElement.attributes['cs-type'].value !== 'text'))
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
                        if(event.clipboardData.getData('text/plain'))
                            var pastedText = event.clipboardData.getData('text/plain');
                        else
                            var pastedText = event.originalEvent.clipboardData.getData('text/plain');
                        document.execCommand("insertHTML", false, pastedText.replace(/<[^<]+?>/g, ''));
                    }
                });

                // Watch for edits to the page and save them
                elm.on('keyup focusout', function(event) {
                    // todo: Open quick-save option
                    // $rootScope.$broadcast('notify', {message: '<a ng-controller="pageCtrl" ng-click="savePage()">Quick Save</a>', duration: 99999});

                    // Make sure we aren't saving escaped HTML
                    if(scope.editor.codeEditor)
                        var html = scope.unescapeHTML(elm.html());
                    else
                        var html = elm.html();

                    // Don't save the fields marked 'none'
                    if(attrs.csContent === 'none') {
                        $rootScope.$broadcast('wysiwygEdit', { html: html });
                    } else
                    {
                        // Save changes to Page factory
                        if(attrs.csContent !== 'header' && attrs.csContent !== 'subheader' && attrs.csContent !== 'body')
                            if(attrs.type === 'text')
                                Page.extras[attrs.csContent] = html.replace(/<[^<]+?>/g, '');
                            else
                                Page.extras[attrs.csContent] = html;
                        else{
                            if(attrs.type === 'text')
                                Page[attrs.csContent] = html.replace(/<[^<]+?>/g, '');
                            else
                                Page[attrs.csContent] = html;
                        }

                        // Save to local storage
                        localStorage.setItem($routeParams.url + attrs.csContent, html);
                    }
                });

                // Make content editable
                elm.attr('contenteditable', 'true');

                // Hide toolbar on focus out
                elm.on('focusout blur', function(){
                    $rootScope.$broadcast('hideWYSIWYG');
                });

                // View HTML code
                scope.$on('toggleHTMLEditor', function(){
                    // Make sure to only edit the selected block
                    if(scope.currentBlock === attrs.csContent){
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
                    if(attrs.csContent === 'none')
                        $rootScope.$broadcast('wysiwygEdit', { html: html });
                    if(attrs.csContent !== 'header' && attrs.csContent !== 'subheader' && attrs.csContent !== 'body')
                        if(attrs.type === 'text')
                            Page.extras[attrs.csContent] = html.replace(/<[^<]+?>/g, '');
                        else
                            Page.extras[attrs.csContent] = html;
                    else {
                        if(attrs.type === 'text')
                            Page[attrs.csContent] = html.replace(/<[^<]+?>/g, '');
                        else
                            Page[attrs.csContent] = html;
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
                    // Remove <pre> formating tags
                    str = str.replace(/<pre>/g, '');
                    str = str.replace(/<pre[^>]+?>/g, '');
                    str = str.replace(/<\/pre>/g, '');

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
}]);
