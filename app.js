/*
 * Copyright 2021 @OpenAdvice
 * Author: Dominic Lehr
/*
 * --------------------------------------------------------------------------------
 * Description: Main Module for the inventory observer
 *        TODO:
 * --------------------------------------------------------------------------------
 */

const cron = require('node-cron');
const axios = require('axios');
const oracledb = require('oracledb');

const { getCurrentDate } = require('./helperFunctions');

let entitiesInAsm = {};
let connectivityData = [];
let asmEntriesToCreate = {};

/******************* CONFIGURATION *******************/
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let SCHEDULE = process.env.SCHEDULE;
if (!SCHEDULE) {
  SCHEDULE = '*/16 * * * *';
}

let CON_DB_QUERY_FIELDS = process.env.CON_DB_QUERY_FIELDS;
if (!CON_DB_QUERY_FIELDS) {
  CON_DB_QUERY_FIELDS = 'NAME,DESCRIPTION,SRCDEVICE,SRCINTERFACE,DSTDEVICE,DSTINTERFACE';
}

let CON_DB_NAME = process.env.CON_DB_NAME;
if (!CON_DB_NAME) {
  CON_DB_NAME = 'CONNECTIONS';
}

let CON_DB_QUERY_SQL = process.env.CON_DB_QUERY_SQL;
if (!CON_DB_QUERY_SQL) {
  CON_DB_QUERY_SQL = 'select __CON_DB_QUERY_FIELDS__ from __CON_DB_NAME__';
}

CON_DB_QUERY_SQL = CON_DB_QUERY_SQL.replace('__CON_DB_QUERY_FIELDS__', CON_DB_QUERY_FIELDS);
CON_DB_QUERY_SQL = CON_DB_QUERY_SQL.replace('__CON_DB_NAME__', CON_DB_NAME);

console.log(getCurrentDate() + ` Using query <${CON_DB_QUERY_SQL}> to query database...`);

let CON_DB_CON = process.env.CON_DB_CON;
if (!CON_DB_CON) {
  console.error('Missing env variable CON_DB_CON! Using default...');
  CON_DB_CON = '127.0.0.1:1521/XE';
}

let CON_DB_USER = process.env.CON_DB_USER;
if (!CON_DB_USER) {
  console.error('Missing env variable CON_DB_USER! Using default...');
  CON_DB_USER = 'sunrise';
}

let CON_DB_PW = process.env.CON_DB_PW;
if (!CON_DB_PW) {
  console.error('Missing env variable CON_DB_PW! Using default...');
  INV_DB_PW = 'oadvice';
}

let ASM_BASE_URL = process.env.ASM_BASE_URL;
if (!ASM_BASE_URL) {
  console.error('Missing env variable ASM_BASE_URL! Using default...');
  ASM_BASE_URL = 'https://192.168.12.226/1.0/rest-observer/rest/';
}

let ASM_TOPO_URL = process.env.ASM_TOPO_URL;
if (!ASM_TOPO_URL) {
  console.error('Missing env variable ASM_TOPO_URL! Using default...');
  ASM_TOPO_URL = 'https://192.168.12.226/1.0/topology/';
}

let ASM_USER = process.env.ASM_USER;
if (!ASM_USER) {
  console.error('Missing env variable ASM_USER! Using default...');
  ASM_USER = 'asm';
}

let ASM_PASS = process.env.ASM_PASS;
if (!ASM_PASS) {
  console.error('Missing env variable ASM_PASS! Using default...');
  ASM_PASS = 'asm';
}

let ASM_TENANT_ID = process.env.ASM_TENANT_ID;
if (!ASM_TENANT_ID) {
  console.error('Missing env variable ASM_TENANT_ID! Using default...');
  ASM_TENANT_ID = 'cfd95b7e-3bc7-4006-a4a8-a73a79c71255';
}

let ASM_EP_JOB_ID = process.env.ASM_EP_JOB_ID;
if (!ASM_EP_JOB_ID) {
  console.error('Missing env variable ASM_EP_JOB_ID! Using default...');
  ASM_EP_JOB_ID = 'snr_inventory';
}

let ASM_EP_RES = process.env.ASM_EP_RES;
if (!ASM_EP_RES) {
  console.error('Missing env variable ASM_EP_RES! Using default...');
  ASM_EP_RES = 'resources';
}

let ASM_EP_REF_DEL = process.env.ASM_EP_REF_DEL;
if (!ASM_EP_REF_DEL) {
  console.error('/out/contains?_delete=nodes&_delete_self=false');
  ASM_EP_REF_DEL = 'resources';
}

let ASM_EP_REF = process.env.ASM_EP_REF;
if (!ASM_EP_REF) {
  console.error('Missing env variable ASM_EP_REF! Using default...');
  ASM_EP_REF = 'references';
}

let ASM_EP_RES_FLT = process.env.ASM_EP_RES_FLT;
if (!ASM_EP_RES_FLT) {
  console.error('Missing env variable ASM_EP_RES_FLT! Using default...');
  ASM_EP_RES_FLT =
    '?_filter=entityTypes%3DnetworkDevice&_field=name&_include_global_resources=false&_include_count=false&_include_status=false&_include_status_severity=false&_include_metadata=false&_return_composites=true';
}

let DELETE_IF_NOT_PRESENT_IN_INV = process.env.DELETE_IF_NOT_PRESENT_IN_INV == 'true' ? true : false;
if (typeof DELETE_IF_NOT_PRESENT_IN_INV === 'undefined') {
  console.error('Missing env variable DELETE_IF_NOT_PRESENT_IN_INV! Using default...');
  DELETE_IF_NOT_PRESENT_IN_INV = true;
}

let ASM_EP_RES_DEL_IMMEDIATE = process.env.ASM_EP_RES_DEL_IMMEDIATE == 'true' ? true : false;
if (typeof ASM_EP_RES_DEL_IMMEDIATE === 'undefined') {
  console.error('Missing env variable ASM_EP_RES_DEL_IMMEDIATE! Using default...');
  ASM_EP_RES_DEL_IMMEDIATE = true;
}

let ASM_EP_DEL_WAIT_TIME_MS = process.env.ASM_EP_DEL_WAIT_TIME_MS;
if (!ASM_EP_DEL_WAIT_TIME_MS) {
  console.error('Missing env variable ASM_EP_DEL_WAIT_TIME_MS! Using default...');
  ASM_EP_DEL_WAIT_TIME_MS = 6000;
} else {
  ASM_EP_DEL_WAIT_TIME_MS = parseInt(ASM_EP_DEL_WAIT_TIME_MS);
}

let ASM_EP_RES_DEL_IMMEDIATE_PARAM = process.env.ASM_EP_RES_DEL_IMMEDIATE_PARAM;
if (!ASM_EP_RES_DEL_IMMEDIATE_PARAM) {
  console.error('Missing env variable ASM_EP_RES_DEL_IMMEDIATE_PARAM! Using default...');
  ASM_EP_RES_DEL_IMMEDIATE_PARAM = '?_immediate=true';
}

let ASM_ENTITY_TYPE = process.env.ASM_ENTITY_TYPE;
if (!ASM_ENTITY_TYPE) {
  console.error('Missing env variable ASM_ENTITY_TYPE! Using default...');
  ASM_ENTITY_TYPE = 'networkDevice';
}

ASM_EP_RES_FLT = ASM_EP_RES_FLT.replace('__ASM_ENTITY_TYPE__', ASM_ENTITY_TYPE);

let ASM_ENTITY_TYPE_IF = process.env.ASM_ENTITY_TYPE_IF;
if (!ASM_ENTITY_TYPE_IF) {
  console.error('Missing env variable ASM_ENTITY_TYPE_IF! Using default...');
  ASM_ENTITY_TYPE_IF = 'networkinterface';
}

let REMOVE_CON_IF_EMPTY_DB = process.env.REMOVE_CON_IF_EMPTY_DB == 'true' ? true : false;
if (typeof REMOVE_CON_IF_EMPTY_DB === 'undefined') {
  console.error('Missing env variable REMOVE_CON_IF_EMPTY_DB! Using default...');
  REMOVE_CON_IF_EMPTY_DB = true;
}

const token = Buffer.from(`${ASM_USER}:${ASM_PASS}`, 'utf8').toString('base64');

/***************** END CONFIGURATION *******************/

//schedule a periodic run
cron.schedule(SCHEDULE || '*/5 * * * *', () => {
  console.log(getCurrentDate() + ' Looking for new data in inventory database...');
  console.log(getCurrentDate() + ' Collecting current ressources from ASM, using filter on type <ASM_ENTITY_TYPE>');
  entitiesInAsm = {};
  connectivityData = [];
  asmEntriesToCreate = {};
  getFromAsm()
    .then((data) => {
      entitiesInAsm = data;

      collectConnectivityData().then((conData) => {
        connectivityData = conData;

        processAsmAndConnectivityData();
      });
    })
    .catch((err) => console.log(err));
});

// getFromAsm()
//   .then((data) => {
//     entitiesInAsm = data;

//     collectConnectivityData().then((conData) => {
//       connectivityData = conData;

//       processAsmAndConnectivityData();
//     });
//   })
//   .catch((err) => console.log(err));

async function processAsmAndConnectivityData() {
  console.log(getCurrentDate() + ' Processing all data...');

  // clear the references from a previous run, this ensures data to be in sync with inventory
  console.log(getCurrentDate() + ' Deleting previous connectivity data from entities...');
  let keys = Object.keys(entitiesInAsm);
  for (const key of keys) {
    await deleteReferenceFromAsm(entitiesInAsm[key]);
  }
  console.log(getCurrentDate() + ' Done deleting previous connectivity data from entities...');

  // first thing is to use the connectivity data to build contains relations between devices and interfaces
  for (const conEle of connectivityData) {
    try {
      const srcdevice = conEle.srcdevice;
      const srcinterface = conEle.srcinterface;
      const srcUniqueId = srcdevice + '_' + srcinterface;

      // check if we already have the source device
      const asmIdSrcDevice = entitiesInAsm[srcdevice];
      if (asmIdSrcDevice) {
        // if we have the source device, delete all its outgpoing connections
        // this will affect the interfaces (contians relation) as well as the references to other interface (connectedTo relations)
        console.log(getCurrentDate() + ` Working on device with ASM ID ${asmIdSrcDevice} ...`);
        let srcInterfaceElement = {};
        srcInterfaceElement.entityTypes = [ASM_ENTITY_TYPE_IF];
        srcInterfaceElement.uniqueId = srcUniqueId;
        srcInterfaceElement.name = srcUniqueId;
        srcInterfaceElement.displayLabel = srcinterface;
        srcInterfaceElement.connectionName = conEle.name;
        asmEntriesToCreate[srcUniqueId] = srcInterfaceElement;
        await sendSingleElementToAsm(srcInterfaceElement, ASM_EP_RES);

        // create the contains relation to the device
        let srcContainsRelation = {};
        srcContainsRelation._fromUniqueId = srcdevice;
        srcContainsRelation._toUniqueId = srcUniqueId;
        srcContainsRelation._edgeType = 'contains';
        await sendSingleElementToAsm(srcContainsRelation, ASM_EP_REF);
      } else {
        // console.log(getCurrentDate() + ` Found an unknown source element in connectivity data: ${srcdevice}`);
      }

      const dstdevice = conEle.dstdevice;
      const dstinterface = conEle.dstinterface;
      const dstUniqueId = dstdevice + '_' + dstinterface;

      // check if we already have the source device
      const asmIdDstDevice = entitiesInAsm[dstdevice];
      if (asmIdDstDevice) {
        let dstInterfaceElement = {};
        dstInterfaceElement.entityTypes = [ASM_ENTITY_TYPE_IF];
        dstInterfaceElement.uniqueId = dstUniqueId;
        dstInterfaceElement.name = dstUniqueId;
        dstInterfaceElement.displayLabel = dstinterface;
        dstInterfaceElement.connectionName = conEle.name;
        asmEntriesToCreate[dstUniqueId] = dstInterfaceElement;
        await sendSingleElementToAsm(dstInterfaceElement, ASM_EP_RES);

        // create the contains relation to the device
        let dstContainsRelation = {};
        dstContainsRelation._fromUniqueId = dstdevice;
        dstContainsRelation._toUniqueId = dstUniqueId;
        dstContainsRelation._edgeType = 'contains';
        await sendSingleElementToAsm(dstContainsRelation, ASM_EP_REF);
      } else {
        // console.log(getCurrentDate() + ` Found an unknown destination element in connectivity data: ${dstdevice}`);
      }

      // we should now have src and st in the system, connect them
      let srcDstRelation = {};
      srcDstRelation._fromUniqueId = srcUniqueId;
      srcDstRelation._toUniqueId = dstUniqueId;
      srcDstRelation._edgeType = 'connectedTo';
      await sendSingleElementToAsm(srcDstRelation, ASM_EP_REF);
    } catch (error) {
      console.log(getCurrentDate() + ' Caught an error while processing data: ' + error);
    }
  }

  console.log(getCurrentDate() + ' Done processing all data...');
}

async function collectConnectivityData() {
  return new Promise(async function (resolve, reject) {
    console.log(getCurrentDate() + ` Looking for new data using query <${CON_DB_QUERY_SQL}>`);

    let connection;
    try {
      connection = await oracledb.getConnection({
        user: CON_DB_USER,
        password: CON_DB_PW,
        connectString: CON_DB_CON,
      });

      const result = await connection.execute(CON_DB_QUERY_SQL, [], {
        resultSet: true,
      });

      if (result) {
        const rs = result.resultSet;
        let row;
        let i = 0;
        const conFieldsArray = CON_DB_QUERY_FIELDS.split(',');
        let entries = [];
        while ((row = await rs.getRow())) {
          let conEntry = {};
          for (const field of conFieldsArray) {
            let val = '' + row[field.trim()];
            val = val.trim();
            val = val.replace(/(?:\r\n|\r|\n)/g, ' ');
            conEntry[field.toLowerCase()] = val;
          }
          entries.push(conEntry);
          i++;
        }
        console.log(getCurrentDate() + ` Found ${i} rows in database.`);

        await rs.close();
        resolve(entries);
      } else {
        console.error(getCurrentDate() + ' Did not get any results from database!');
        reject('Did not get any results from database!');
      }
    } catch (err) {
      console.error(err);
      reject('Error collection connectivity data!');
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
}

async function getFromAsm() {
  return new Promise(function (resolve, reject) {
    console.log(
      getCurrentDate() + ` Collecting current data from ASM using URL ${ASM_TOPO_URL + ASM_EP_RES + ASM_EP_RES_FLT} ...`
    );
    let asmEntries = {};
    try {
      axios
        .get(ASM_TOPO_URL + ASM_EP_RES + ASM_EP_RES_FLT, {
          headers: {
            Authorization: `Basic ${token}`,
            'X-TenantID': ASM_TENANT_ID,
          },
        })
        .then(
          (response) => {
            if (response && response.status && response.status < 400) {
              if (response.data && response.data._items) {
                for (let asmEle of response.data._items) {
                  asmEntries[asmEle.uniqueId] = asmEle._id;
                }
                console.log(getCurrentDate() + ' Done collecting current data from ASM...');
                resolve(asmEntries);
              }
            }
          },
          (error) => {
            console.log(getCurrentDate() + ' Error collection data from ASM.');
            console.log(error);
            if (error && error.response && error.response.data) {
              const errorData = error.response.data;
              if (errorData) {
                console.log(getCurrentDate() + ` Reason:`);
                console.log(errorData);
                reject('An Error occurred while collection data from ASM. Please see previous error messages.');
              }
            }
          }
        );
    } catch (err) {
      console.log(getCurrentDate() + ' Caught an exception while collecting data from ASM!');
      console.error(err);
      reject('An Exception occurred while collection data from ASM. Please see previous error messages.');
    }
  });
}

async function sendToAsm(entries) {
  console.log(getCurrentDate() + ' Sending inventory data to ASM...');
  Object.keys(entries).forEach(function (key) {
    let ele = entries[key];
    try {
      axios
        .post(ASM_BASE_URL + ASM_EP_RES, ele, {
          headers: {
            Authorization: `Basic ${token}`,
            'X-TenantID': ASM_TENANT_ID,
            JobId: ASM_EP_JOB_ID,
          },
        })
        .then(
          (response) => {
            console.log(getCurrentDate() + ' RESPONSE');
            if (response.status && response.status >= 400) {
              console.log(
                getCurrentDate() + ` Received an error response qhile create a ressource in ASM. Ressource: ${ele.name}`
              );
            }
          },
          (error) => {
            console.log(getCurrentDate() + ' ERROR');
            // console.log(getCurrentDate() + ' Error sending the following data to ASM:');
            // console.log(ele);
            // if (error && error.response && error.response.data) {
            //   const errorData = error.response.data;
            //   if (errorData) {
            //     console.log(getCurrentDate() + ` Reason:`);
            //     console.log(errorData);
            //   }
            // }
          }
        );
    } catch (err) {
      console.log(getCurrentDate() + ' Caught an exception while sending data to ASM!');
      console.error(err);
    }
  });
}

async function sendSingleElementToAsm(ele, endpoint) {
  return new Promise(async function (resolve, reject) {
    //console.log(getCurrentDate() + ' Sending element to ASM...');
    try {
      axios
        .post(ASM_BASE_URL + endpoint, ele, {
          headers: {
            Authorization: `Basic ${token}`,
            'X-TenantID': ASM_TENANT_ID,
            JobId: ASM_EP_JOB_ID,
          },
        })
        .then(
          (response) => {
            if (response.status && response.status >= 400) {
              console.log(
                getCurrentDate() + ` Received an error response qhile create a ressource in ASM. Ressource: ${ele.name}`
              );
              reject(`Received an error response qhile create a ressource in ASM. Ressource: ${ele.name}`);
            } else {
              //console.log(getCurrentDate() + ' Successfully sent to ASM.');
              resolve();
            }
          },
          (error) => {
            console.log(getCurrentDate() + ' Error sending the following data to ASM:');
            console.log(ele);
            if (error && error.response && error.response.data) {
              const errorData = error.response.data;
              if (errorData) {
                console.log(getCurrentDate() + ` Reason:`);
                console.log(errorData);
              }
            }
            reject('Error sending data to ASM.');
          }
        );
    } catch (err) {
      console.log(getCurrentDate() + ' Caught an exception while sending data to ASM!');
      console.error(err);
      reject('Caught an exception while sending data to ASM!');
    }
  });
}

async function deleteFromAsm(uniqueId, asmInternalId) {
  console.log(getCurrentDate() + ` Deleting ressource with uniqueId <${uniqueId}> from ASM...`);
  const uri = encodeURI(ASM_BASE_URL + ASM_EP_RES + '/' + uniqueId);
  axios
    .delete(uri, {
      headers: {
        Authorization: `Basic ${token}`,
        'X-TenantID': ASM_TENANT_ID,
        JobId: ASM_EP_JOB_ID,
      },
    })
    .then((response) => {
      if (response && response.status && response.status < 400) {
        console.log(getCurrentDate() + ` Done deleting ressource with uniqueId <${uniqueId}> from ASM...`);
        if (ASM_EP_RES_DEL_IMMEDIATE === true) {
          // the previous delete is async, we need to wait a moment until we finally delete the elemet for good
          console.log(getCurrentDate() + ' Waiting for ressource to be gone...');
          setTimeout(function () {
            console.debug(
              getCurrentDate() +
                ` Deleting ressource with name <${uniqueId}> for good, using uniqueID <${asmInternalId}>`
            );
            const uri = encodeURI(ASM_TOPO_URL + ASM_EP_RES + '/' + asmInternalId + ASM_EP_RES_DEL_IMMEDIATE_PARAM);
            axios
              .delete(uri, {
                headers: {
                  Authorization: `Basic ${token}`,
                  'X-TenantID': ASM_TENANT_ID,
                },
              })
              .then((response) => {
                if (response && response.status && response.status < 400) {
                  console.debug(`Successfully deleted ressource with name: ${uniqueId}. for good.`);
                  console.log(getCurrentDate() + ' ----------------------');
                } else {
                  console.error(getCurrentDate() + ` Error deleting ressource with name: ${uniqueId} immediately`);
                }
              })
              .catch((error) => {
                let message = getCurrentDate() + ` Error deleting ressource with name: ${uniqueId} for good.`;
                //   console.log(error);
                if (error && error.response && error.response.data && error.response.data.message) {
                  message += ` Message from API: ${error.response.data.message}`;
                }
                console.error(message);
              });
          }, ASM_EP_DEL_WAIT_TIME_MS);
        }
      } else {
        console.error(getCurrentDate() + ` Error deleting ressource with name: ${uniqueId}. Response code gt 400`);
      }
    })
    .catch((error) => {
      const message = getCurrentDate() + ` Error deleting ressource with name: ${uniqueId}`;
      console.error(message);
      console.log(error);
    });
}

async function deleteReferenceFromAsm(eleAsmId) {
  return new Promise(async function (resolve, reject) {
    console.log(getCurrentDate() + ` Deleting references from ressource with ASM id ${eleAsmId}`);
    try {
      axios
        .delete(ASM_TOPO_URL + ASM_EP_RES + '/' + encodeURIComponent(eleAsmId) + ASM_EP_REF_DEL, {
          headers: {
            Authorization: `Basic ${token}`,
            'X-TenantID': ASM_TENANT_ID,
          },
        })
        .then(
          (response) => {
            if (response.status && response.status >= 400) {
              console.error(
                getCurrentDate() +
                  ` Received an error response while deleting a reference from ASM. Ressource: ${eleAsmId}`
              );
              reject(`Received an error response while deleting a reference from ASM. Ressource: ${eleAsmId}`);
            } else {
              console.log(getCurrentDate() + ' Successfully deleted refernece from ASM.');
              resolve();
            }
          },
          (error) => {
            console.error(getCurrentDate() + ' Error deleting a reference from ASM:');
            console.log(error);
            if (error && error.response && error.response.data) {
              const errorData = error.response.data;
              if (errorData) {
                if (errorData.message) console.log(getCurrentDate() + ` Reason: ${errorData.message}`);
              }
            }
            reject('Error deleting a reference from ASM.');
          }
        );
    } catch (err) {
      console.log(getCurrentDate() + ' Caught an exception while deleting a reference from ASM.!');
      console.error(err);
      reject('Caught an exception while deleting a reference from ASM.!');
    }
  });
}
