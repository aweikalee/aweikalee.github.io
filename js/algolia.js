"use strict";function loadAlgolia(e,s){var a=instantsearch({indexName:e.indexName,searchClient:algoliasearch(e.applicationId,e.apiKey)});a.addWidgets([instantsearch.widgets.configure({attributesToSnippet:["excerpt"]})]),a.addWidget(instantsearch.widgets.searchBox({container:"#algolia-input",placeholder:s.hint,showReset:!1,showSubmit:!1,showLoadingIndicator:!1,cssClasses:{root:"searchbox-input-container",form:"searchbox-input-container",input:"searchbox-input"}})),a.addWidget(instantsearch.widgets.poweredBy({container:"#algolia-poweredby"})),a.addWidget(instantsearch.widgets.hits({container:".searchbox-body",escapeHTML:!1,cssClasses:{root:"searchbox-result-container",emptyRoot:["searchbox-result-item","disabled"]},templates:{empty:function(e){return s.no_result+": "+e.query},item:function(e){var a=instantsearch.highlight({attribute:"title",hit:e}),t=instantsearch.highlight({attribute:"excerpt",hit:e});return a=a||s.untitled,t=(t=t.replace(new RegExp("<em>","ig"),"[algolia-highlight]").replace(new RegExp("</em>","ig"),"[/algolia-highlight]").replace(/(<([^>]+)>)/gi,"").replace(/(\[algolia-highlight\])/gi,"<em>").replace(/(\[\/algolia-highlight\])/gi,"</em>"))||s.empty_preview,'<section class="searchbox-result-section">\n                        <a class="searchbox-result-item" href="'.concat(e.permalink,'">\n                            <span class="searchbox-result-content">\n                                <span class="searchbox-result-title">').concat(a,'</span>\n                                <span class="searchbox-result-preview">').concat(t,"</span>\n                            </span>\n                        </a>\n                    </section>")}}})),a.addWidget(instantsearch.widgets.pagination({container:".searchbox-footer",cssClasses:{list:"searchbox-pagination",item:"searchbox-pagination-item",link:"searchbox-pagination-link",selectedItem:"active",disabledItem:"disabled"}})),a.start(),"#algolia-search"===location.hash.trim()&&$(".searchbox").addClass("show"),$(document).on("click",".navbar-main .search",function(){$(".searchbox").toggleClass("show"),$(".searchbox-input").focus()}).on("click",".searchbox .searchbox-mask",function(){$(".searchbox").removeClass("show")}).on("click",".searchbox-close",function(){$(".searchbox").removeClass("show")})}