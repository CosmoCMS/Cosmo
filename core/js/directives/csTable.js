/**************************************************
 *              Table Directive                   *
 *             Make HTML tables                   *
 **************************************************/

angular.module('cosmo').directive('csTable', ['Page', '$routeParams', '$rootScope', 'Users', '$sce', '$timeout', function(Page, $routeParams, $rootScope, Users, $sce, $timeout) {
    return {
        template: '<table><tr ng-repeat="row in rows track by $index" ng-click="clickedRow({{$index}})" ng-init="isFirst=$first"><th ng-if="isFirst&&tableHeader" ng-repeat="col in row track by $index" ng-click="clickedCol({{$index}})">{{col}}</th><td ng-if="!isFirst||!tableHeader" ng-repeat="col in row track by $index" ng-click="clickedCol({{$index}})">{{col}}</td></tr></table>',
        replace: true,
        scope: {},
        link: function(scope, elm, attrs) {

            var updateCosmoTable = function(){
                if(Page.extras[attrs.csTable])
                    scope.rows = angular.fromJson(Page.extras[attrs.csTable]);
                else if(Users.admin)
                    scope.rows = [['', '']];

                scope.tableHeader = Page.extras[attrs.csTable + '-header'];
            };
            updateCosmoTable();

            // Display the WYSIWYG toolbar
            elm.on('mousedown', function(event) {
                $rootScope.$broadcast('activateWYSIWYG', event);
            });

            // Keep track of the last clicked row
            scope.clickedRow = function(index){
                Page.misc.selectedRow = index;
                Page.misc.selectedTable = attrs.csTable;
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
                            Page.extras[attrs.csTable] = rows;
                    });
                });

                // Add table header
                scope.$on('addTableHeader', function(){
                    Page.extras[attrs.csTable + '-header'] = true;
                    scope.tableHeader = true;
                });

                // Remove table header
                scope.$on('removeTableHeader', function(){
                    Page.extras[attrs.csTable + '-header'] = false;
                    scope.tableHeader = false;
                });

                // Add a row above the selected row
                scope.$on('addRowAbove', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.csTable){
                        var columns = [];
                        angular.forEach(scope.rows[0], function(){
                            columns.push('');
                        });

                        Page.extras[attrs.csTable].splice(Page.misc.selectedRow, 0, columns);
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });

                // Add a row below the selected row
                scope.$on('addRowBelow', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.csTable){

                        var columns = [];
                        angular.forEach(scope.rows[0], function(){
                            columns.push('');
                        });

                        // Check if this is the last row
                        if(scope.rows.length === Page.misc.selectedRow + 1)
                            Page.extras[attrs.csTable].push(columns); // scope.rows.push(columns);
                        else
                            Page.extras[attrs.csTable].splice(Page.misc.selectedRow+1, 0, columns); // scope.rows.splice(scope.selectedRow, 0, columns);

                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });

                // Delete row
                scope.$on('deleteRow', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.csTable){
                        // scope.rows.splice(scope.selectedRow, 1);
                        Page.extras[attrs.csTable].splice(Page.misc.selectedRow, 1);
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });

                // Add a column to the right of the selected column
                scope.$on('addColRight', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.csTable){
                        // Iterate through all rows
                        var tempTable = angular.copy(Page.extras[attrs.csTable]);
                        for(var i=0; i<tempTable.length; i++){
                            // Add a blank column (string) in the desired location
                            // scope.rows[i].splice(scope.selectedCol + 1, 0, '');
                            tempTable[i].splice(Page.misc.selectedCol + 1, 0, '');
                        }
                        Page.extras[attrs.csTable] = tempTable; //scope.rows;
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });

                // Add a column to the left of the selected column
                scope.$on('addColLeft', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.csTable){
                        // Iterate through all rows
                        var tempTable = angular.copy(Page.extras[attrs.csTable]);
                        for(var i=0; i<tempTable.length; i++){
                            // Add a blank column (string) in the desired location
                            // scope.rows[i].splice(scope.selectedCol, 0, '');
                            tempTable[i].splice(Page.misc.selectedCol, 0, '');
                        }
                        Page.extras[attrs.csTable] = tempTable; // scope.rows;
                        updateCosmoTable();
                        Page.misc.lastChange = data;
                    }
                });

                // Delete a column
                scope.$on('deleteCol', function(event, data){
                    if(Page.misc.lastChange !== data && Page.misc.selectedTable === attrs.csTable){
                        // Iterate through all rows
                        for(var i=0; i<scope.rows.length; i++){
                            // Delete the column in the desired location
                            // scope.rows[i].splice(scope.selectedCol, 1);
                            Page.extras[attrs.csTable][i].splice(Page.misc.selectedCol, 1);
                            Page.misc.lastChange = data;
                        }

                        updateCosmoTable();
                    }
                });

                // Delete this table
                scope.$on('deleteTable', function(){
                    if(Page.misc.selectedTable === attrs.csTable)
                        elm.remove();
                });
            }
        }
    };
}]);
