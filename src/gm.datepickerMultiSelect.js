/*
The MIT License (MIT)

Copyright (c) 2014 Gregory McGee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function (angular) {
	'use strict';
	
	angular.module('gm.datepickerMultiSelect', ['ui.bootstrap'])
	.config(['$provide', '$injector', function ($provide, $injector) {

		// extending datepicker (access to attributes and app scope through $parent)
		var datepickerDelegate = function ($delegate) {
			var directive = $delegate[0];

			// Override compile
			var link = directive.link;

			directive.compile = function () {
				return function (scope, element, attrs, ctrls) {
					link.apply(this, arguments);

					if(!angular.isDefined(attrs.multiSelect)) return;

					scope.selectedDates = [];
					scope.selectRange;

					scope.$parent.$watchCollection(attrs.multiSelect, function (newVal) {
						scope.selectedDates = newVal || [];
					});

					attrs.$observe('selectRange', function (newVal) {
						scope.selectRange = !!newVal && newVal !== "false";
					});

					var ngModelCtrl = ctrls[1];

					ngModelCtrl.$viewChangeListeners.push(function() {
						var newVal = scope.$parent.$eval(attrs.ngModel);
						if(!newVal)
							return;

						var dateVal = newVal.setHours(0, 0, 0, 0),
							selectedDates = scope.selectedDates;

						if (scope.selectRange) {
							// reset range
							if (!selectedDates.length || selectedDates.length > 1 || selectedDates[0] == dateVal)
								return selectedDates.splice(0, selectedDates.length, dateVal);

							selectedDates.push(dateVal);

							var tempVal = Math.min.apply(null, selectedDates);
							var maxVal = Math.max.apply(null, selectedDates);

							// Start on the next day to prevent duplicating the	first date
							tempVal = new Date(tempVal).setHours(24);
							while (tempVal < maxVal) {
								selectedDates.push(tempVal);

								// Set a day ahead after pushing to prevent duplicating last date
								tempVal = new Date(tempVal).setHours(24);
							}
						} else {
							if (selectedDates.indexOf(dateVal) < 0) {
								selectedDates.push(dateVal);
							} else {
								selectedDates.splice(selectedDates.indexOf(dateVal), 1);
							}
						}
					});
				}
			}

			return $delegate;
		}

		if ($injector.has('datepickerDirective'))
			$provide.decorator('datepickerDirective', ['$delegate', datepickerDelegate]);

		if ($injector.has('uibDatepickerDirective'))
			$provide.decorator('uibDatepickerDirective', ['$delegate', datepickerDelegate]);

		// extending daypicker (access to day and datepicker scope through $parent)
		var daypickerDelegate = function ($delegate, $templateCache) {
			var directive = $delegate[0];

			$templateCache.put("uib/template/datepicker/multi-day.html",
	        "<table class=\"uib-daypicker\" role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
	        "  <thead>\n" +
	        "    <tr>\n" +
	        "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
	        "      <th colspan=\"{{::5 + showWeeks}}\"><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
	        "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
	        "    </tr>\n" +
	        "    <tr>\n" +
	        "      <th ng-if=\"showWeeks\" class=\"text-center\"></th>\n" +
	        "      <th ng-repeat=\"label in ::labels track by $index\" class=\"text-center\"><small aria-label=\"{{::label.full}}\">{{::label.abbr}}</small></th>\n" +
	        "    </tr>\n" +
	        "  </thead>\n" +
	        "  <tbody>\n" +
	        "    <tr class=\"uib-weeks\" ng-repeat=\"row in rows track by $index\">\n" +
	        "      <td ng-if=\"showWeeks\" class=\"text-center h6\"><em>{{ weekNumbers[$index] }}</em></td>\n" +
	        "      <td ng-repeat=\"dt in row\" class=\"uib-day text-center\" role=\"gridcell\"\n" +
	        "        id=\"{{::dt.uid}}\"\n" +
	        "        ng-class=\"::dt.customClass\">\n" +
	        "        <button type=\"button\" class=\"btn btn-default btn-sm\"\n" +
	        "            ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\"\n" +
	        "          ng-click=\"select(dt.date)\"\n" +
	        "          ng-disabled=\"::dt.disabled\"\n" +
	        "          tabindex=\"-1\"><span ng-class=\"::{'text-muted': dt.secondary, 'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
	        "      </td>\n" +
	        "    </tr>\n" +
	        "  </tbody>\n" +
	        "</table>\n" +
	        "");

	        directive.templateUrl = "uib/template/datepicker/multi-day.html";

			// Override compile
			var link = directive.link;

			directive.compile = function () {
				return function (scope, element, attrs, ctrls) {
					link.apply(this, arguments);

					if(!angular.isDefined(scope.$parent.selectedDates)) return;

					scope.$parent.$watchCollection('selectedDates', update);

					/*
						Fires when date is selected or when month is changed.
						UI bootstrap versions before 0.14.0 had just one controller DatepickerController,
						now they have UibDatepickerController, UibDaypickerController and DatepickerController
						see more on https://github.com/angular-ui/bootstrap/commit/44354f67e55c571df28b09e26a314a845a3b7397?diff=split#diff-6240fc17e068eaeef7095937a1d63eaeL251
						and https://github.com/angular-ui/bootstrap/commit/44354f67e55c571df28b09e26a314a845a3b7397?diff=split#diff-6240fc17e068eaeef7095937a1d63eaeR462
					*/
					var ctrl = angular.isArray(ctrls) ? ctrls[0] : ctrls;
					scope.$watch(function () {
						return ctrl.activeDate.getTime();
					}, update);

					function update() {
						angular.forEach(scope.rows, function (row) {
							angular.forEach(row, function (day) {
								day.selected = scope.selectedDates.indexOf(day.date.setHours(0, 0, 0, 0)) > -1
							});
						});
					}
				}
			}

			return $delegate;
		}

		if ($injector.has('daypickerDirective'))
			$provide.decorator('daypickerDirective', ['$delegate', '$templateCache', daypickerDelegate]);

		if ($injector.has('uibDaypickerDirective'))
			$provide.decorator('uibDaypickerDirective', ['$delegate', '$templateCache', daypickerDelegate]);
	}]);
})(window.angular);
