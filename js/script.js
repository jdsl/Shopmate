(function($) {
		
		"use strict";
		
		var DEBUG = false, // make true to enable debug output
			PLUGIN_IDENTIFIER = "RangeSlider";
	
		var RangeSlider = function( element, options ) {
			this.element = element;
			this.options = options || {};
			this.defaults = {
				output: {
					prefix: '', // function or string
					suffix: '', // function or string
					format: function(output){
						return output;
					}
				},
				change: function(event, obj){}
			};
			// This next line takes advantage of HTML5 data attributes
			// to support customization of the plugin on a per-element
			// basis.
			this.metadata = $(this.element).data('options');
		};

		RangeSlider.prototype = {

			////////////////////////////////////////////////////
			// Initializers
			////////////////////////////////////////////////////
			
			init: function() {
				if(DEBUG && console) console.log('RangeSlider init');
				this.config = $.extend( true, {}, this.defaults, this.options, this.metadata );

				var self = this;
				// Add the markup for the slider track
				this.trackFull = $('<div class="track track--full"></div>').appendTo(self.element);
				this.trackIncluded = $('<div class="track track--included"></div>').appendTo(self.element);
				this.inputs = [];
				
				$('input[type="range"]', this.element).each(function(index, value) {
					var rangeInput = this;
					// Add the ouput markup to the page.
					rangeInput.output = $('<output>').appendTo(self.element);
					// Get the current z-index of the output for later use
					rangeInput.output.zindex = parseInt($(rangeInput.output).css('z-index')) || 1;
					// Add the thumb markup to the page.
					rangeInput.thumb = $('<div class="slider-thumb">').prependTo(self.element);
					// Store the initial val, incase we need to reset.
					rangeInput.initialValue = $(this).val();
					// Method to update the slider output text/position
					rangeInput.update = function() {
						if(DEBUG && console) console.log('RangeSlider rangeInput.update');
						var range = $(this).attr('max') - $(this).attr('min'),
							offset = $(this).val() - $(this).attr('min'),
							pos = offset / range * 100 + '%',
							transPos = offset / range * -100 + '%',
							prefix = typeof self.config.output.prefix == 'function' ? self.config.output.prefix.call(self, rangeInput) : self.config.output.prefix,
							format = self.config.output.format($(rangeInput).val()),
							suffix = typeof self.config.output.suffix == 'function' ? self.config.output.suffix.call(self, rangeInput) : self.config.output.suffix;
						
						// Update the HTML
						$(rangeInput.output).html(prefix + '' + format + '' + suffix);
						$(rangeInput.output).css('left', pos);
						$(rangeInput.output).css('transform', 'translate('+transPos+',0)');
						
						// Update the IE hack thumbs
						$(rangeInput.thumb).css('left', pos);
						$(rangeInput.thumb).css('transform', 'translate('+transPos+',0)');
						
						// Adjust the track for the inputs
						self.adjustTrack();
					};
					
					// Send the current ouput to the front for better stacking
					rangeInput.sendOutputToFront = function() {
						$(this.output).css('z-index', rangeInput.output.zindex + 1);
					};
					
					// Send the current ouput to the back behind the other
					rangeInput.sendOutputToBack = function() {
						$(this.output).css('z-index', rangeInput.output.zindex);
					};
					
					///////////////////////////////////////////////////
					// IE hack because pointer-events:none doesn't pass the 
					// event to the slider thumb, so we have to make our own.
					///////////////////////////////////////////////////
					$(rangeInput.thumb).on('mousedown', function(event){
						// Send all output to the back
						self.sendAllOutputToBack();
						// Send this output to the front
						rangeInput.sendOutputToFront();
						// Turn mouse tracking on
						$(this).data('tracking', true);
						$(document).one('mouseup', function() {
							// Turn mouse tracking off
							$(rangeInput.thumb).data('tracking', false);
							// Trigger the change event
							self.change(event);
						});
					});
					
					// IE hack - track the mouse move within the input range
					$('body').on('mousemove', function(event){
						// If we're tracking the mouse move
						if($(rangeInput.thumb).data('tracking')) {
							var rangeOffset = $(rangeInput).offset(),
								relX = event.pageX - rangeOffset.left,
								rangeWidth = $(rangeInput).width();
							// If the mouse move is within the input area
							// update the slider with the correct value
							if(relX <= rangeWidth) {
								var val = relX/rangeWidth;
								$(rangeInput).val(val * $(rangeInput).attr('max'));
								rangeInput.update();
							}
						}
					});
					
					// Update the output text on slider change
					$(this).on('mousedown input change touchstart', function(event) {
						if(DEBUG && console) console.log('RangeSlider rangeInput, mousedown input touchstart');
						// Send all output to the back
						self.sendAllOutputToBack();
						// Send this output to the front
						rangeInput.sendOutputToFront();
						// Update the output
						rangeInput.update();
					});
					
					// Fire the onchange event 
					$(this).on('mouseup touchend', function(event){
						if(DEBUG && console) console.log('RangeSlider rangeInput, change');
						self.change(event);
					});
					
					// Add this input to the inputs array for use later
					self.inputs.push(this);
				});
				
				// Reset to set to initial values
				this.reset();
				
				// Return the instance
				return this;
			},
			
			sendAllOutputToBack: function() {
				$.map(this.inputs, function(input, index) {
					input.sendOutputToBack();
				});
			},
			
			change: function(event) {
				if(DEBUG && console) console.log('RangeSlider change', event);
				// Get the values of each input
				var values = $.map(this.inputs, function(input, index) {
					return {
						value: parseInt($(input).val()),
						min: parseInt($(input).attr('min')),
						max: parseInt($(input).attr('max'))
					};
				});
				
				// Sort the array by value, if we have 2 or more sliders
				values.sort(function(a, b) {
					return a.value - b.value;
				});
				
				// call the on change function in the context of the rangeslider and pass the values
				this.config.change.call(this, event, values);
			},
			
			reset: function() {
				if(DEBUG && console) console.log('RangeSlider reset');
				$.map(this.inputs, function(input, index) {
					$(input).val(input.initialValue);
					input.update();
				});
			},
			
			adjustTrack: function() {
				if(DEBUG && console) console.log('RangeSlider adjustTrack');
				var valueMin = Infinity,
					rangeMin = Infinity,
					valueMax = 0,
					rangeMax = 0;
				
				// Loop through all input to get min and max
				$.map(this.inputs, function(input, index) {
					var val = parseInt($(input).val()),
						min = parseInt($(input).attr('min')),
						max = parseInt($(input).attr('max'));
					
					// Get the min and max values of the inputs
					valueMin = (val < valueMin) ? val : valueMin;
					valueMax = (val > valueMax) ? val : valueMax;
					// Get the min and max possible values
					rangeMin = (min < rangeMin) ? min : rangeMin;
					rangeMax = (max > rangeMax) ? max : rangeMax;
				});
				
				// Get the difference if there are 2 range input, use max for one input.
				// Sets left to 0 for one input and adjust for 2 inputs
				if(this.inputs.length > 1) {
					this.trackIncluded.css('width', (valueMax - valueMin) / (rangeMax - rangeMin) * 100 + '%');
					this.trackIncluded.css('left', (valueMin - rangeMin) / (rangeMax - rangeMin) * 100 + '%');
				} else {
					this.trackIncluded.css('width', valueMax / (rangeMax - rangeMin) * 100 + '%');
					this.trackIncluded.css('left', '0%');
				}
			}
		};
	
		RangeSlider.defaults = RangeSlider.prototype.defaults;
		
		$.fn.RangeSlider = function(options) {
			if(DEBUG && console) console.log('$.fn.RangeSlider', options);
			return this.each(function() {
				var instance = $(this).data(PLUGIN_IDENTIFIER);
				if(!instance) {
					instance = new RangeSlider(this, options).init();
					$(this).data(PLUGIN_IDENTIFIER,instance);
				}
			});
		};
	
	}
)(jQuery);


var rangeSlider = $('#facet-price-range-slider');
if(rangeSlider.length > 0) {
  rangeSlider.RangeSlider({
    output: {
      format: function(output){
        return output.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
      },
      suffix: function(input){
        return parseInt($(input).val()) == parseInt($(input).attr('max')) ? this.config.maxSymbol : '';
      }
    }
  });
}



//$(document).ready(function () {
//	  if (!$.browser.webkit) {
//		  $('.wrapper').html('<p>Sorry! Non webkit users. :(</p>');
//	  }
//});

 /* Images Crousal */

 /* Quanity JS */

$('.minus-btn').on('click', function(e) {
		e.preventDefault();
		var $this = $(this);
		var $input = $this.closest('div').find('input');
		var value = parseInt($input.val());

		if (value > 1) {
			value = value - 1;
		} else {
			value = 0;
		}

	$input.val(value);

	});

	$('.plus-btn').on('click', function(e) {
		e.preventDefault();
		var $this = $(this);
		var $input = $this.closest('div').find('input');
		var value = parseInt($input.val());

		if (value < 100) {
		value = value + 1;
		} else {
			value =100;
		}

		$input.val(value);
	});

  $('.like-btn').on('click', function() {
	$(this).toggleClass('is-active');
  });



 /* Raring JS */

$(document).ready(function(){
  
  /* 1. Visualizing things on Hover - See next part for action on click */
  $('#stars li').on('mouseover', function(){
    var onStar = parseInt($(this).data('value'), 10); // The star currently mouse on
   
    // Now highlight all the stars that's not after the current hovered star
    $(this).parent().children('li.star').each(function(e){
      if (e < onStar) {
        $(this).addClass('hover');
      }
      else {
        $(this).removeClass('hover');
      }
    });
    
  }).on('mouseout', function(){
    $(this).parent().children('li.star').each(function(e){
      $(this).removeClass('hover');
    });
  });
  
  
  /* 2. Action to perform on click */
  $('#stars li').on('click', function(){
    var onStar = parseInt($(this).data('value'), 10); // The star currently selected
    var stars = $(this).parent().children('li.star');
    
    for (i = 0; i < stars.length; i++) {
      $(stars[i]).removeClass('selected');
    }
    
    for (i = 0; i < onStar; i++) {
      $(stars[i]).addClass('selected');
    }
    
    // JUST RESPONSE (Not needed)
    var ratingValue = parseInt($('#stars li.selected').last().data('value'), 10);
    var msg = "";
    if (ratingValue > 1) {
        msg = "Thanks! You rated this " + ratingValue + " stars.";
    }
    else {
        msg = "We will improve ourselves. You rated this " + ratingValue + " stars.";
    }
    responseMessage(msg);
    
  });
  
  
});


function responseMessage(msg) {
  $('.success-box').fadeIn(200);  
  $('.success-box div.text-message').html("<span>" + msg + "</span>");
}



 /* Cart */


(function(){
 
  $("#cart").on("click", function() {
    $(".shopping-cart").fadeToggle( "fast");
  });
  
  $(".shopping-cart .dropdown-toggle").on("click", function() {
    $(".shopping-cart").fadeToggle( "fast");
  });
  
  
  
  
})();

 /* Color Hover */

// Javascript for detecting browsers who do not support this, and provide fallback
if (window.navigator.userAgent.indexOf("Edge") !== -1 || navigator.appVersion.indexOf("MSIE 10") !== -1 || window.navigator.userAgent.indexOf("Trident/7.0") > 0) { 
    document.documentElement.className += ' crappy-browser';
} else {
    document.documentElement.className += ' modern-browser';
}


 /* Product Hover Effect */


$(document).ready(function(){
	
	// Lift card and show stats on Mouseover
	$('.product-card').hover(function(){
			$(this).addClass('animate');
			$('div.carouselNext, div.carouselPrev').addClass('visible');			
		 }, function(){
			$(this).removeClass('animate');			
			$('div.carouselNext, div.carouselPrev').removeClass('visible');
	});	
	
	// Flip card to the back side
	$('#view_details').click(function(){		
		$('div.carouselNext, div.carouselPrev').removeClass('visible');
		$('.product-card').addClass('flip-10');
		setTimeout(function(){
			$('.product-card').removeClass('flip-10').addClass('flip90').find('div.shadow').show().fadeTo( 80 , 1, function(){
				$('#product-front, #product-front div.shadow').hide();			
			});
		}, 50);
		
		setTimeout(function(){
			$('.product-card').removeClass('flip90').addClass('flip190');
			$('#product-back').show().find('div.shadow').show().fadeTo( 90 , 0);
			setTimeout(function(){				
				$('.product-card').removeClass('flip190').addClass('flip180').find('div.shadow').hide();						
				setTimeout(function(){
					$('.product-card').css('transition', '100ms ease-out');			
					$('#cx, #cy').addClass('s1');
					setTimeout(function(){$('#cx, #cy').addClass('s2');}, 100);
					setTimeout(function(){$('#cx, #cy').addClass('s3');}, 200);				
					$('div.carouselNext, div.carouselPrev').addClass('visible');				
				}, 100);
			}, 100);			
		}, 150);			
	});			
	
	// Flip card back to the front side
	$('#flip-back').click(function(){		
		
		$('.product-card').removeClass('flip180').addClass('flip190');
		setTimeout(function(){
			$('.product-card').removeClass('flip190').addClass('flip90');
	
			$('#product-back div.shadow').css('opacity', 0).fadeTo( 100 , 1, function(){
				$('#product-back, #product-back div.shadow').hide();
				$('#product-front, #product-front div.shadow').show();
			});
		}, 50);
		
		setTimeout(function(){
			$('.product-card').removeClass('flip90').addClass('flip-10');
			$('#product-front div.shadow').show().fadeTo( 100 , 0);
			setTimeout(function(){						
				$('#product-front div.shadow').hide();
				$('.product-card').removeClass('flip-10').css('transition', '100ms ease-out');		
				$('#cx, #cy').removeClass('s1 s2 s3');			
			}, 100);			
		}, 150);			
		
	});	

	
	/* ----  Image Gallery Carousel   ---- */
	
	var carousel = $('#carousel ul');
	var carouselSlideWidth = 335;
	var carouselWidth = 0;	
	var isAnimating = false;
	
	// building the width of the casousel
	$('#carousel li').each(function(){
		carouselWidth += carouselSlideWidth;
	});
	$(carousel).css('width', carouselWidth);
	
	// Load Next Image
	$('div.carouselNext').on('click', function(){
		var currentLeft = Math.abs(parseInt($(carousel).css("left")));
		var newLeft = currentLeft + carouselSlideWidth;
		if(newLeft == carouselWidth || isAnimating === true){return;}
		$('#carousel ul').css({'left': "-" + newLeft + "px",
							   "transition": "300ms ease-out"
							 });
		isAnimating = true;
		setTimeout(function(){isAnimating = false;}, 300);			
	});
	
	// Load Previous Image
	$('div.carouselPrev').on('click', function(){
		var currentLeft = Math.abs(parseInt($(carousel).css("left")));
		var newLeft = currentLeft - carouselSlideWidth;
		if(newLeft < 0  || isAnimating === true){return;}
		$('#carousel ul').css({'left': "-" + newLeft + "px",
							   "transition": "300ms ease-out"
							 });
	    isAnimating = true;
		setTimeout(function(){isAnimating = false;}, 300);			
	});
});



/* LightSlider */
 


$(document).ready(function() {
	$("#content-slider").lightSlider({
		loop:true,
		keyPress:true
	});
	$('#image-gallery').lightSlider({
		gallery:true,
		item:1,
		thumbItem:3,
		slideMargin: 20,
		speed:500,
		auto:true,
		loop:true,
		onSliderLoad: function() {
			$('#image-gallery').removeClass('cS-hidden');
		}  
	});
});



/* LightSlider */

$(".widget-color input").click(function(){
  $(this).parent().toggleClass("active");
});


$(".widget-size .size-label").click(function(){
  $('.widget-size .size-label').removeClass("active");
  $(this).toggleClass("active");
});


/* Add to Cart Animation */


$('.add-to-cart').on('click', function () {
	var cart = $('.shopping-cart-1');
	
	var imgtodrag = $(this).parent().parent().parent().parent().parent('.item').find("img").eq(0);
	if (imgtodrag) {
		var imgclone = imgtodrag.clone()
			.offset({
			top: imgtodrag.offset().top,
			left: imgtodrag.offset().left
		})
			.css({
			'opacity': '0.5',
				'position': 'absolute',
				'height': '150px',
				'width': '150px',
				'z-index': '100'
		})
			.appendTo($('body'))
			.animate({
			'top': cart.offset().top + 10,
				'left': cart.offset().left + 10,
				'width': 75,
				'height': 75
		}, 1000, 'easeInOutExpo');
		
		setTimeout(function () {
			cart.effect("shake", {
				times: 2
			}, 200);
		}, 1500);

		imgclone.animate({
			'width': 0,
				'height': 0
		}, function () {
			$(this).detach()
		});
	}
});

$('.add-to-cart-2').on('click', function () {
	var cart = $('.shopping-cart-2');
	
	var imgtodrag = $(this).parent().parent().parent('.single-product').find("img").eq(1);
	if (imgtodrag) {
		var imgclone = imgtodrag.clone()
			.offset({
			top: imgtodrag.offset().top,
			left: imgtodrag.offset().left
		})
			.css({
			'opacity': '0.5',
				'position': 'absolute',
				'height': '150px',
				'width': '150px',
				'z-index': '100'
		})
			.appendTo($('body'))
			.animate({
			'top': cart.offset().top + 10,
				'left': cart.offset().left + 10,
				'width': 75,
				'height': 75
		}, 1000, 'easeInOutExpo');
		
		setTimeout(function () {
			cart.effect("shake", {
				times: 2
			}, 200);
		}, 1500);

		imgclone.animate({
			'width': 0,
				'height': 0
		}, function () {
			$(this).detach()
		});
	}
});