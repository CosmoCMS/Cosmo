/**************************************************
 *              WYSIWYG Directive                 *
 **************************************************/

angular.module('cosmo').directive('csWysiwyg', ['$rootScope', 'Page', '$compile', '$timeout', function($rootScope, Page, $compile, $timeout){
    return {
        templateUrl: 'core/html/toolbar.html',
        replace: true,
        scope: {},
        link: function(scope, elm, attr){

            scope.editor = {
                codeEditor: false,
                showToolbar: false,
                tableRows: [],
                directives: Page.directives
            };
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
                document.execCommand('insertHTML', false, '<table cs-table="'+ tempTimestamp +'"></table>');
                $rootScope.$broadcast('saveAndRefresh');
            };

            // Turn the toolbar on and position it just above the mouse click
            scope.$on('activateWYSIWYG', function(event, data){
                // Wait for the next digest cycle in case user clicked from another editable div.
                // Focusout from one editable div closes the toolbar.
                $timeout(function(){
                    scope.editor.showToolbar = true;
                    scope.editor.dropdown = null;
                });
                var pageX = data.pageX - 120; // -120 centers toolbar
                var pageY = data.pageY - 75; // Go directly above click. CSS margin pushes this above mouse

                // Make sure the toolbar isn't too far to the left (where it cuts off toolbar items)
                if((pageX - 50) < 0)
                    pageX = 0;

                // Make sure the toolbar isn't too far to the right (where it cuts off toolbar items)
                if((pageX + 250) > window.innerWidth)
                    pageX = window.innerWidth - 300;

                // Make sure the toolbar isn't too far down (where it cuts off the dropdowns)
                if((data.clientY + 100) > window.innerHeight)
                    pageY = pageY - 100;

                elm.css('top', pageY + 'px');
                elm.css('left', pageX + 'px');
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
            scope.action = function(action, premade, premadeDesc){

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
                            document.execCommand('insertHTML', false, '<div cs-table="'+ timestamp +'"></div>');
                            $rootScope.$broadcast('saveAndRefresh');
                        }
                        break;
                    case 'photo':
                        document.execCommand('insertHTML', false, '<img cs-image="'+ new Date().getTime() +'">');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'bgimage':
                        document.execCommand('insertHTML', false, '<div cs-bg-image="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'audio':
                        document.execCommand('insertHTML', false, '<audio controls cs-audio="'+ new Date().getTime() +'"></audio>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'video':
                        document.execCommand('insertHTML', false, '<video cs-movie="'+ new Date().getTime() +'"></video>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'videourl':
                        var url = prompt("Video embed URL:\ne.g. http://www.youtube.com/embed/JMl8cQjBfqk");
                        if(url)
                            document.execCommand('insertHTML', false, '<div video="'+ url +'" height="315" width="560" fluidvids><iframe src="'+ url +'"></iframe></div>');
                        break;
                    case 'gallery':
                        document.execCommand('insertHTML', false, '<img cs-gallery="'+ new Date().getTime() +'">');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'div':
                        var classes = prompt("CSS classes:");
                        if(classes)
                            document.execCommand('insertHTML', false, '<div class="'+ classes +'"></div>');
                        break;
                    case 'html':
                        var snippet = prompt("HTML Snippet:");
                        if(snippet)
                            document.execCommand('insertHTML', false, snippet);
                        break;
                    case 'custom':
                        var directive = prompt("Directive:");
                        if(directive)
                            document.execCommand('insertHTML', false, '<div '+ directive +'></div>');
                        break;
                     case 'premade':
                        // If there's a description, prompt user for a value
                        if(premadeDesc){
                            var directive = prompt(premadeDesc);
                            document.execCommand('insertHTML', false, '<div '+ premade +'="'+ directive +'"></div>');
                        } else
                            document.execCommand('insertHTML', false, '<div '+ premade +'></div>');
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

                // Hide WYWSIWYG editor
                $rootScope.$broadcast('hideWYSIWYG');
            };
        }
    };
}]);
