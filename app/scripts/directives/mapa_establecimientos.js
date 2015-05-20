'use strict';
/**
 * @ngdoc directive
 * @name yvyUiApp.directive:mapaLeaflet
 * @description
 * # mapaLeaflet
 */
angular.module('yvyUiApp')
  .directive('mapaEstablecimientos', function (mapaEstablecimientoFactory) {
    return {
      restrict: 'E',
      replace: false,
      scope: {
        data:'=',
        filtro:'=',
        detalle:'=',
        ready: '='
      },
      templateUrl: 'views/templates/template_mapa.html',
      link: function postLink(scope, element, attrs) {

        var invalidateSize = function(animate){ map.invalidateSize(animate); };
        var target, result, rightPanelOpen, currentZoom, filterFlag = false;

        $('#map').data('right-sidebar-visible', false);

        $('#left-panel').panelslider({
                                  side: 'left',
                                  duration: 200,
                                  clickClose: false,
                                  container: $('[ng-view]'),
                                  onStartOpen: function(){
                                    //invalidateSize(true);
                                  },
                                  onOpen: function(){
                                    invalidateSize(true);
                                  },
                                  onClose: function(){
                                    var width = rightPanelOpen ? 'calc(100% - 350px)' : '100%'
                			              $('#filtroDepartamento').select2('close');
                          			    $('#filtroDistrito').select2('close');
                          			    $('#filtroBarrioLocalidad').select2('close');
                				            $('#filtroCodigoEstablecimiento').select2('close');
                                    $('#map').css('width', width);
                                    invalidateSize(true);
                                  },
                                  onStartClose: function(){
                                    $('#map').css('width', 'calc(100% + 240px)');
                                    invalidateSize(false);
                                  }
                                });        
        
        /* El watch nos permitira filtrar los establecimientos (y por consiguiente, los respectivos Markers) */
        scope.$watch('filtro', function(filtro){
          console.log('watch mapa');
          if(filtro){
            console.time('filtrando');
            var establecimientos_visibles = establecimientos;
            $.each(filtro, function(index, value){
              establecimientos_visibles = filtrar_establecimientos(establecimientos_visibles, value);
            });
            MECONF.establecimientosVisibles = establecimientos_visibles;
            console.timeEnd('filtrando');
            result = draw_map(filtro);
          }
          console.log(filtro);
        });

        var fitMap = function(map, bounds, zoom, callback){
          if(MECONF.geoJsonLayer.getLayers().length){
            if(filterFlag){
              map.off('move', updateMap);
              map.once('moveend', function(){ addUpdateHandlers(callback); });
              map.fitBounds(MECONF.geoJsonLayer.getBounds(), {maxZoom: result.maxZoom});
            }
            filterFlag = true;
          }else{
            map.setView([-24, -57.189], 7, {animate: true});
          }
        }
        
        var addUpdateHandlers = function(callback){
          //map.on('zoomend', updateMap);
          if(_.isFunction(callback)) callback();
          map.on('move', updateMap);
        }

        scope.$on('detail-open', function(){
          rightPanelOpen = true;
          $('#map').css('width', 'calc(100% - 450px)');
          invalidateSize(true);
          draw_map();
          //map.setZoom(16);
          //map.panTo(target.layer.getLatLng());
        });

        scope.$on('detail-start-open', function(){
          map.off('move', updateMap);
          map.on('moveend', addUpdateHandlers);
          //map.setZoom(17, {animate: true});
          map.panTo(target.getLatLng());
        });

        scope.$on('detail-close', function(){
          rightPanelOpen = false;
          invalidateSize(true);
          MECONF.infoBox.update(MECONF.establecimientosVisibles.features);
          removeCircles();
          draw_map();
        });

        scope.$on('detail-start-close', function(){
/*          map.off('zoomend', updateMap);
          map.off('move', updateMap);
          map.on('moveend', addUpdateHandlers);
*/        $('#map').css('width', '100%');
          //invalidateSize(true);
        });

        /* Funcion que reduce la lista de establecimientos acorde al filtro seleccionado */
        var filtrar_establecimientos = function(establecimientos, filtro){
          var e =  
          { 'type' : 'FeatureCollection',
            'features' : []
          };
          $.each(establecimientos.features, function(index, value){
            if (filtro.eval(value.properties[filtro.atributo])){
              e.features.push(value);
            }
          });
          return e;
        };

        /* Funcion que inicializa el mapa */
        var init_map = function() {
          console.time('dibujo');
          console.time('init_map');
          startLoading();

          L.mapbox.accessToken = 'pk.eyJ1IjoicnBhcnJhIiwiYSI6IkEzVklSMm8ifQ.a9trB68u6h4kWVDDfVsJSg';
          var layers = MECONF.LAYERS();
          var mapbox = layers.MAPBOX.on('load', tilesLoaded);
          var osm = layers.OPEN_STREET_MAPS.on('load', tilesLoaded);

          var gglHybrid = layers.GOOGLE_HYBRID.on('MapObjectInitialized', setup_gmaps);
          var gglRoadmap = layers.GOOGLE_ROADMAP.on('MapObjectInitialized', setup_gmaps);


          var map = L.map('map', {maxZoom: 18, minZoom: 3, worldCopyJump: true, attributionControl: false})
                  .setView([-24, -57.189], 7)
                  .on('baselayerchange', startLoading);

          var baseMaps = {
              'Calles OpenStreetMap': osm,
              'Terreno': mapbox,
              'Satélite': gglHybrid,
              'Calles Google Maps': gglRoadmap
          };

          map.addLayer(gglRoadmap);

          

          L.control.layers(baseMaps).addTo(map);
          console.timeEnd('init_map');

          return map;
        };

        var getMarkerClass = function(feature){
          var clazz = 'm1';
          if(feature.properties.cantidad > 9) clazz = 'm2';
          if(feature.properties.cantidad > 99) clazz = 'm3';
          if(feature.properties.cantidad > 999) clazz = 'm4';
          return clazz;
        }

        var draw_markers = function(){
          var geoJson = L.mapbox.featureLayer();

          geoJson.on('layeradd', function (e) {
            var content, icon, color, marker = e.layer,
                    feature = marker.feature;

            if (feature.properties['periodo'] || feature.properties.cantidad === 1) {
              color = 'orange';
              icon = L.AwesomeMarkers.icon({
                icon: 'home',
                markerColor: color,
                prefix: 'glyphicon'
              });
            }else{
              color = 'blue';
              content = sprintf('<div>%s</div>', feature.properties.cantidad);
              icon = L.divIcon({
                className: getMarkerClass(feature),
                html: content
              });
            }
            marker.setIcon(icon);
          });

          MECONF.infoBox = draw_info_box();
          MECONF.infoBox.addTo(map);

          MECONF.geoJsonLayer = geoJson; //Sobre esta variable se aplican los filtros
          
          MECONF.geoJsonLayer.on('click', draw_popup);

          MECONF.geoJsonLayer.on('mouseover', function(e){
            var features, properties = e.layer.feature.properties;
            if(properties['periodo'] || properties.cantidad === 1){ //Hover para un solo establecimiento
              //nothing to do
            }else if(properties.cantidad && !properties.nombre_departamento && !properties.nombre_distrito && !properties.nombre_barrio_localidad){
              MECONF.infoBox.update();
            }else{
              features = _.filter(MECONF.establecimientosVisibles.features, function(n) {
                var result = _.deburr(n.properties['nombre_departamento']) == _.deburr(properties.nombre_departamento);
                if(properties.nombre_distrito){ result = result && _.deburr(n.properties['nombre_distrito']) == _.deburr(properties.nombre_distrito); }
                if(properties.nombre_barrio_localidad){ result = result && _.deburr(n.properties['nombre_barrio_localidad']) == _.deburr(properties.nombre_barrio_localidad); }
                return result;
              });
              MECONF.infoBox.update(features);
            }
          });
          
          MECONF.geoJsonLayer.on('mouseout', function(e){
            var properties = e.layer.feature.properties;
            if(properties['periodo'] || properties.cantidad === 1){
              //nothing to do
            }else{
              MECONF.infoBox.update();
            }
          });
          
          MECONF.geoJsonLayer.addTo(map);

          //map.on('zoomend', updateMap);
          map.on('move', updateMap);

        }

        var updateMap = _.throttle(function(){ draw_map(); }, 200);

        /* Funcion que dibuja el mapa de acuerdo a los establecimientos filtrados y al zoom actual */
        var draw_map = function(filtros){
          console.time('draw_map');
          console.time('primera parte');
          var maxZoom, e, filterByDepartamento, filterByDistrito, filterByLocalidad, levelZoom = map.getZoom();
          MECONF.currentZoom = MECONF.currentZoom || levelZoom;
          var redrawClusters = filtros || levelZoom !== MECONF.currentZoom;
          var testLayer = L.mapbox.featureLayer();

          if(filtros){
            filterByLocalidad = _.filter(filtros, function(f){ return f.atributo === 'nombre_barrio_localidad' && f.valor.length; }).length > 0;
            filterByDistrito = _.filter(filtros, function(f){ return f.atributo === 'nombre_distrito' && f.valor.length; }).length > 0 && !filterByLocalidad; 
            filterByDepartamento = _.filter(filtros, function(f){ return f.atributo === 'nombre_departamento' && f.valor.length; }).length > 0 && !filterByDistrito;
            
            if(filterByDepartamento) maxZoom = MECONF.nivelesZoom['departamento'] - 1; 
            if(filterByDistrito) maxZoom = MECONF.nivelesZoom['distrito'] - 1; 
            if(filterByLocalidad) maxZoom = MECONF.nivelesZoom['barrio_localidad'] - 1; 
            if(!filterByDepartamento && !filterByDistrito && !filterByLocalidad){
              maxZoom = MECONF.nivelesZoom['departamento'] - 1;
            }
            levelZoom = maxZoom;
          }

          console.timeEnd('primera parte');
          //console.log('levelZoom: ' + levelZoom);
          console.time('filtrado');
          console.log('zoom: ' + levelZoom);
          if(redrawClusters){
            e = getClusterByZoom(levelZoom);
          }else{
            e = MECONF.geoJsonLayer.getGeoJSON();
          }
          
          console.timeEnd('filtrado');
          console.time('bounds');

          if( levelZoom < MECONF.nivelesZoom['barrio_localidad'] && filtros ){
            var codigos_establecimientos = _.pluck(MECONF.establecimientosVisibles.features, 'properties');
            codigos_establecimientos =  _.pluck(codigos_establecimientos, 'codigo_establecimiento');
            //scope.$parent.getInstituciones(codigos_establecimientos); //El controller se encarga de cargar la Lista de Detalles
          }
          var afterFit = function(){ drawVisibleMarkers(e)};
          console.timeEnd('bounds');
          //console.log(e

          console.time('ultimo');
          var outerBounds;
          console.log(redrawClusters);
          if(redrawClusters){
            MECONF.infoBox.update(MECONF.establecimientosVisibles.features);
            if(filtros){
              MECONF.geoJsonLayer.setGeoJSON(e);
              outerBounds = MECONF.geoJsonLayer.getBounds();
              console.log(levelZoom);
              fitMap(map, outerBounds, levelZoom, afterFit);
              levelZoom = map.getZoom();
              //e = getClusterByZoom(levelZoom);

            }else{
              drawVisibleMarkers(e);
            }
            //console.time('esta');
            //console.timeEnd('esta');

          }else{
            drawVisibleMarkers(e);
          }
          
          MECONF.currentZoom = levelZoom;
          console.timeEnd('ultimo');              
          console.timeEnd('draw_map');
          return {map: map, maxZoom: maxZoom };
        };

        var drawVisibleMarkers = function(e){
          console.time('visible');
          var bounds = map.getBounds();
          e.features = _.filter(MECONF.allFeatures, function(punto){
            var latLon = [punto.geometry.coordinates[1], punto.geometry.coordinates[0]];
            return bounds.contains(latLon);
          });
          console.timeEnd('visible');

          console.time('geojson');

          MECONF.geoJsonLayer.setGeoJSON(e);
          console.timeEnd('geojson');

          //MECONF.currentZoom = levelZoom;
        }

        var getClusterByZoom = function(levelZoom){
          var e;
          if(levelZoom < MECONF.nivelesZoom['pais']){
            e = filtrar_cluster('pais');
          } else if (levelZoom < MECONF.nivelesZoom['departamento']) { //cluster por departamento (por defecto)
            e = filtrar_cluster('departamento');
            console.log('cluster by departamento');
          } else if ((levelZoom >= MECONF.nivelesZoom['departamento'] && levelZoom < MECONF.nivelesZoom['distrito'])) { //cluster por distrito
            e = filtrar_cluster('distrito');
            console.log('cluster by distrito');

          } else if ((levelZoom >= MECONF.nivelesZoom['distrito'] && levelZoom < MECONF.nivelesZoom['barrio_localidad'])) { //cluster por barrio/localidad
            console.log('cluster by localidad');
            e = filtrar_cluster('barrio_localidad');
          }else{
            console.log('no cluster');
            e = _.clone(MECONF.establecimientosVisibles);
          }
          MECONF.allFeatures = e.features;
          return e;
        }

        /* Funcion que filtra el cluster a mostrar, ya sea por Departamentos/Distritos/BarrioLocalidad */
        var filtrar_cluster = function(tipo){
          var clusterPais;
          if(tipo === 'pais'){
            clusterPais = mapaEstablecimientoFactory.getCentroPais();
            clusterPais.features[0].properties.cantidad = MECONF.establecimientosVisibles.features.length;
            return clusterPais;
          }

          var tipo_cluster = 'cluster_'+tipo;
          //Reemplazar por llamada al service
          console.time('cluster index');
          //build a cluster index
          var clusterIndex = mapaEstablecimientoFactory.getClusterIndex(tipo_cluster);
          var coordinatesIndex = {};
          console.timeEnd('cluster index');

          var e =  
          { 'type' : 'FeatureCollection',
            'features' : []
          };

          var keyAccesor;
          switch(tipo){
            case 'departamento':
              keyAccesor = function(f){ return _.deburr(f.properties['nombre_departamento']); };
              break;
            case 'distrito':
              keyAccesor = function(f){ return _.deburr(f.properties['nombre_departamento']) + _.deburr(f.properties['nombre_distrito']); };
              break;
            case 'barrio_localidad':
              keyAccesor = function(f){ return _.deburr(f.properties['nombre_departamento']) + _.deburr(f.properties['nombre_distrito']) + _.deburr(f.properties['nombre_barrio_localidad']); };
              break;
          }

          console.time('cluster features');
          _.each(MECONF.establecimientosVisibles.features, function(f){
            var key = keyAccesor(f);
            if(clusterIndex[key]){
              clusterIndex[key].properties.cantidad++;
              coordinatesIndex[key] = f.geometry.coordinates;
              //clusterIndex[key].properties.targetChild = f;
            }
          });

          /* Si el cluster es de un elemento, se desplaza su centro:
             Del centroide del poligono al punto del unico establecimiento del cluster
          */
          _.forOwn(clusterIndex, function(c, k){
            if(c.properties.cantidad === 1){
              c.geometry.coordinates = coordinatesIndex[k];    
            } 
          });

          console.timeEnd('cluster features');

          console.time('cluster filter');
          e.features = _(clusterIndex).values().filter(function(f){ return f.properties.cantidad; }).value();
          console.timeEnd('cluster filter');
          console.log(e);
          return e;

        };
        
        /* Funcion que calcula la distancia entre dos puntos */
        function two_points_distances() {
          
        }

        function removeCircles(){
          map.eachLayer(function(layer){
            if(layer instanceof L.Circle) map.removeLayer(layer);
          });
        }

        /* Funcion que carga el resumen del Popup */
        function draw_popup(t){
          removeCircles();
          target = t.layer;
          var feature = (target.feature.properties.cantidad === 1) ? mapaEstablecimientoFactory.getClusterElementChild(target.feature) : target.feature;
          //var feature = target.feature;
          //map.panTo(target.layer.getLatLng()); //funcion que centra el mapa sobre el marker

          scope.$apply(function(){
            var levelZoom = map.getZoom();
            var latLon, targetChild, targetZoom;
            var icon, color, radius;
            if(feature.properties['periodo']){ //Verificamos que se trata de un establecimiento
              
              latLon = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
              radius = Math.pow(19 - levelZoom, 2) * 10;
              L.circle(latLon, radius, {
                  color: 'blue',
                  fillOpacity: 0.5
                }).addTo(map);
              scope.detalle = feature.properties;
              MECONF.infoBox.update(feature);
              if(rightPanelOpen === true){
                map.setView(latLon);
              }

            }else{
              //targetChild = target.layer.feature.properties.targetChild; //Se toma el primero, se podria tomar random tambien
              targetZoom = _.find(_.values(MECONF.nivelesZoom), function(z){ return z > levelZoom; });
              targetChild = mapaEstablecimientoFactory.getClusterElementChild(target.feature);
              latLon = [targetChild.geometry.coordinates[1], targetChild.geometry.coordinates[0]];
              map.setView(latLon, targetZoom); //funcion que centra el mapa sobre el marker
            }
          });

        }

        /* Funcion que dibuja el resumen de los establecimientos */
        function draw_info_box() {
          var info = L.control();

          info.onAdd = function (map) {
              this._div = L.DomUtil.create('div', 'info-box'); // create a div with a class "info"
              this.update();
              return this._div;
          };

          // method that we will use to update the control based on feature properties passed
          info.update = function (f) {
              var msg = this._div.innerHTML;
              if (f instanceof Array) { //Cuando se hace hover sobre un Marker de Cluster
                msg = get_summary_message(f);
              } else if (f) {  //Cuando es hace el popup de un Marker
                msg = sprintf('Mostrando un establecimiento<br/>del departamento %s,<br/>del distrito %s,<br/>de la localidad %s',
                          f.properties['nombre_departamento'], f.properties['nombre_distrito'], f.properties['nombre_barrio_localidad']);
              }else if(typeof f === 'undefined'){ //Primera vez
                if(MECONF.establecimientosVisibles){
                  msg = get_summary_message(MECONF.establecimientosVisibles.features);
                }else{
                  //nothing to do
                }
              }

              this._div.innerHTML = msg;
          };

          return info;
        }

        function get_summary_message(features) {
          var cantidadDepartamentos = _(features)
              .map(function (f) {
                  return f.properties['nombre_departamento'];
              })
              .filter(function(e){ return e !== 'ASUNCION';})
              .unique().value().length;

          var cantidadDistritos = _(features)
              .map(function (f) {
                  return f.properties['nombre_distrito'];
              })
              .unique().value().length;

          var cantidadBarriosLocalidaes = _(features)
              .map(function (f) {
                  return f.properties['nombre_barrio_localidad'];
              })
              .unique().value().length;

          if (cantidadDepartamentos === 0) {
              cantidadDepartamentos += 1;
          }

          var cantidadEstablecimientos = _(features)
            .map(function (f){
              return f.properties['codigo_establecimiento'];
            })
            .unique().value().length;

          var establecimientosLabel = cantidadEstablecimientos > 1 ? 'establecimientos' : 'establecimiento';
          var departamentoLabel = cantidadDepartamentos > 1 ? 'departamentos' : 'departamento';
          var distritoLabel = cantidadDistritos > 1 ? 'distritos' : 'distrito';
          var barrioLocalidadLabel = cantidadBarriosLocalidaes > 1 ? 'localidades' : 'localidad';

          return sprintf('%s %s de %s %s, %s %s y %s %s',
                  cantidadEstablecimientos, establecimientosLabel, cantidadDepartamentos, departamentoLabel,
                  cantidadDistritos, distritoLabel, cantidadBarriosLocalidaes, barrioLocalidadLabel);
        }

        //Funcion que inicializa el Spinner (Loading)
        var startLoading = function() {
          var spinner = new Spinner({
              color: "#ffb885",
              radius: 10,
              width: 5,
              length: 10,
              top: '92%',
              left: '98%'
          }).spin();
          $("#map").removeClass().append(spinner.el);
        };


        //Funcion que finaliza el Spinner (Loading)
        var finishedLoading = function() {

          if(tilesLoaded && establecimientos){
            $(".spinner").remove();
            MECONF.tilesLoaded = false;
            console.timeEnd('dibujo');
          }

        };

        var tilesLoaded = function(){
          MECONF.tilesLoaded = true;
          finishedLoading();
        }
       
        //Configuracion del Gmaps listener
        var setup_gmaps = function() {
          google.maps.event.addListenerOnce(this._google, 'tilesloaded', tilesLoaded);
        };

        /******************************** INICIO **************************************/        
        
        //Detalles de la configuracion del mapa
        var MECONF = MECONF || {};
        MECONF.tilesLoaded = false;

        MECONF.LAYERS = function () {
            var mapbox = L.tileLayer(
                    'http://api.tiles.mapbox.com/v4/rparra.jmk7g7ep/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicnBhcnJhIiwiYSI6IkEzVklSMm8ifQ.a9trB68u6h4kWVDDfVsJSg');
            var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {minZoom: 3});
            var gglHybrid = new L.Google('HYBRID');
            var gglRoadmap = new L.Google('ROADMAP');
            return {
                MAPBOX: mapbox,
                OPEN_STREET_MAPS: osm,
                GOOGLE_HYBRID: gglHybrid,
                GOOGLE_ROADMAP: gglRoadmap
            }
        };

        MECONF.nivelesZoom = {pais: 6, departamento:11, distrito:14, barrio_localidad:17}; //niveles de zoom para departamento/distrito/barrioLocalidad

        var establecimientos;
        var map = init_map();

        var unwatch = scope.$watch('ready', function(ready) {
          //console.log(ready);
          //console.timeEnd('scope notified');
          if(ready){
            unwatch(); //Remove the watch
            console.time('draw Markers');
            draw_markers();
            console.timeEnd('draw Markers');
            establecimientos = mapaEstablecimientoFactory.getEstablecimientos();
            console.timeEnd('servicio');
            finishedLoading();
          }
        });

      }//link: function postLink(scope, element, attrs) {
    };
  });
