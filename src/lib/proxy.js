"use strict";

const access = require('./access.js');
const { AccessLevel, servicePathProtection, getServicePathFromHeader } = access;
const request = require('request');
const http = require('http');
const url = require('url');
const config = require('../config.js');
const axios = require('axios');
const querystring = require('querystring');
const mongoProxy   = require('./mongo-proxy.js');
const orionProxy   = require('./orion-proxy.js');
const elsProxy     = require('./els-proxy.js');
const socialsProxy = require('./social-proxy.js');
const notifsProxy  = require('./notif-proxy.js');
const usersProxy   = require('../routes/users/user.route.js');


function install(router, keycloak) {

  router.get(    '/domains/:domain/sensors',                                           proxy([req => orionProxy.getSensorsOrion(           req.params.domain)]));
  router.post(   '/domains/:domain/sensors',                                           proxy([req => orionProxy.postSensorOrion(           req.params.domain, req.body), 
                                                                                              req => mongoProxy.postSensorMongo(           req.params.domain, req.body)]));
  router.get(    '/domains/:domain/sensors/:sensorID',                                 proxy([req => orionProxy.getSensorOrion(            req.params.domain, req.params.sensorID)]));
  router.delete( '/domains/:domain/sensors/:sensorID',                                 proxy([req => orionProxy.deleteSensor(              req.params.domain, req.params.sensorID),
                                                                                              req => mongoProxy.deleteSensorMongo(         req.params.domain, req.params.sensorID)]));
  router.put(    '/domains/:domain/sensors/:sensorID/owner',                           proxy([req => orionProxy.putSensorOwner(            req.params.domain, req.params.sensorID, req.body)]));
  router.put(    '/domains/:domain/sensors/:sensorID/location',                        proxy([req => orionProxy.putSensorLocation(         req.params.domain, req.params.sensorID, req.body)]));
  router.put(    '/domains/:domain/sensors/:sensorID/name',                            proxy([req => orionProxy.putSensorName(             req.params.domain, req.params.sensorID, req.body)]));
  router.get(    '/domains/:domain/sensors/:sensorID/measurements',                    proxy([req => orionProxy.getSensorMeasurements(     req.params.domain, req.params.sensorID)]));
  router.post(   '/domains/:domain/sensors/:sensorID/measurements',                    proxy([req => orionProxy.postSensorMeasurement(     req.params.domain, req.params.sensorID, req.body),
                                                                                              req => mongoProxy.postSensorMeasMongo(       req.params.domain, req.params.sensorID, req.body)]));
  router.get(    '/domains/:domain/sensors/:sensorID/measurements/:measID',            proxy([req => orionProxy.getSensorMeasurement(      req.params.domain, req.params.sensorID, req.params.measID)]));
  router.delete( '/domains/:domain/sensors/:sensorID/measurements/:measID',            proxy([req => orionProxy.deleteSensorMeasurement(   req.params.domain, req.params.sensorID, req.params.measID),
                                                                                              req => mongoProxy.deleteMeasMongo(           req.params.domain, req.params.sensorID, req.params.measID)]));
  router.put(    '/domains/:domain/sensors/:sensorID/measurements/:measID/name',       proxy([req => orionProxy.putSensorMeasurementName(  req.params.domain, req.params.sensorID, req.params.measID, req.body)]));
  router.put(    '/domains/:domain/sensors/:sensorID/measurements/:measID/dimension',  proxy([req => orionProxy.putSensorMeasurementDim(   req.params.domain, req.params.sensorID, req.params.measID, req.body)]));
  router.put(    '/domains/:domain/sensors/:sensorID/measurements/:measID/unit',       proxy([req => orionProxy.putSensorMeasurementUnit(  req.params.domain, req.params.sensorID, req.params.measID, req.body)]));
  router.put(    '/domains/:domain/sensors/:sensorID/measurements/:measID/sensor_kind',proxy([req => orionProxy.putSensorMeasurementKind(  req.params.domain, req.params.sensorID, req.params.measID, req.body)]));
  router.get(    '/domains/:domain/sensors/:sensorID/measurements/:measID/values',     proxy([req => mongoProxy.getSensorMeasurementValues(req.params.domain, req.params.sensorID, req.params.measID)]));
  router.post(   '/domains/:domain/sensors/:sensorID/measurements/:measID/values',     proxy([req => orionProxy.getSensorMeasurement(      req.params.domain, req.params.sensorID, req.params.measID),
                                                                                              req => mongoProxy.postDatapointMongo(        req.params.domain, req.params.sensorID, req.params.measID, req.body)]));
   
  router.get(    '/domains/:domain/history/*', elsProxy.getHistory);
  
  router.get(    '/domains/:domain/socials',        proxy([req => socialsProxy.getSocialMsgs(     req.params.domain)]));
  router.post(   '/domains/:domain/socials',        proxy([req => socialsProxy.postSocialMsg(     req.params.domain, req.body)]));
  router.get(    '/domains/:domain/socials/:msgID', proxy([req => socialsProxy.getSocialMsg(      req.params.domain, req.params.msgID)]));
  router.delete( '/domains/:domain/socials/:msgID', proxy([req => socialsProxy.deleteSocialMsg(   req.params.domain, req.params.msgID)]));
  router.post(   '/domains/:domain/socials/batch',  proxy([req => socialsProxy.postSocialMsgBatch(req.params.domain, req.body)]));

  router.get(    '/domains/:domain/notifications',        proxy([notifsProxy.getNotifsOrion]));
  router.post(   '/domains/:domain/notifications',        proxy([notifsProxy.postNotifOrion]));
  router.get(    '/domains/:domain/notifications/:msgID', proxy([notifsProxy.getNotifOrion]));
  router.delete( '/domains/:domain/notifications/:msgID', proxy([notifsProxy.deleteNotifOrion]));
 
  router.post(   '/domains/:domain/auth',           proxy([req => usersProxy.postAuth(  req.params.domain)]));
  router.get(    '/domains/:domain/users',          proxy([req => usersProxy.getUsers(  req.params.domain)]));
  router.post(   '/domains/:domain/users',          proxy([req => usersProxy.postUsers( req.params.domain)]));
  router.get(    '/domains/:domain/users/:userID',  proxy([req => usersProxy.getUser(   req.params.domain, req.params.userID)]));
  router.delete( '/domains/:domain/users/:userID',  proxy([req => usersProxy.deleteUser(req.params.domain, req.params.userID)]));
  router.put(    '/domains/:domain/users/:userID',  proxy([req => usersProxy.putUser(   req.params.domain, req.params.userID)]));
}

//Perform one or several requests to backend components and send back results to user
function proxy(requests) {
  return async (req, res) => {
    try {
      for (let request of requests) {
        var resp = await request(req)
      }
      //send the result back to the user
      res.send(resp);

    } catch (err) {
      if (err.response) {
        // The request was made and the server responded with a status code
        // We forward it to the user
        res.status(err.response.status);
        res.send(err.response.data); 
        console.log('Proxy response error:', err.response.data);
      } else if (err.request) {
        // The request was made but no response was received
        console.log('Proxy error, no response received');
        res.status(503);
        res.send('Proxy error: backend service unavailable');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Proxy error:', err);
        console.log('Proxy error:', err.stack);
        res.status(500);
        res.send(err.stack);

      }
    }
  }
}

module.exports = { install } 
