var fs = require('fs.extra'); //require the fs module + extra methods
var chokidar = require('chokidar'); //for file watching - https://www.npmjs.com/package/chokidar
var junk = require('junk'); //to filter out ds.store files 

var gm = require('gm');  //require image magick https://www.npmjs.com/package/gm

//require the node printer module
var printer = require('printer'),
    util = require('util');

//directories for incoming and processed (outgoing files)
var incomingDir = 'scans_incoming';
var processedDir = 'scans_processed';

//select default printer -- double check which one i'm printing to
var my_printer = printer.getDefaultPrinterName(); 
console.log(my_printer);
// //list all printers on my computer
// console.log("installed printers:\n"+util.inspect(printer.getPrinters(), {colors:true, depth:10}));

//require node-tesseract for doing ocr on the prompts
var tesseract = require('node-tesseract');

//initalize a watcher to look for a new scan in the 'scans_incoming' folder
var watcher = chokidar.watch(incomingDir, {
  ignoreInitial: true,
  ignored: /[\/\\]\./,
  persistent: true
});

//when a scan is added, call the function processScan
watcher.on('add', processScan);


function processScan(path) { 
  console.log('File', path, 'has been added'); 

  getOCRText(path); //pass the prompt to the function that does ocr + returns which prompt it is
  
}


//rotate the image so it's upright
//extract the prompt from the piece of paper using OCR -- https://www.npmjs.com/package/node-tesseract
//----- NOTES FOR SCANNING -----
function getOCRText(path) {

  var prompt;

  // //flip the image 180 degrees - NOT WORKING
  // gm('mirror.jpg')
  // .flip()
  // // .rotate('white', 180)
  // .write('test_gm.jpg', function (err) { //rewrite the original path of the image to replace it
  //   if (!err) {
  //     console.log('image rotated 180 degrees');
  //   }
  //   else {
  //     console.log(err);
  //   }
  // });

  tesseract.process(path,function(err, text) {
    if(err) {
      console.error(err);
    } else {
      // console.log(text);
      getPrompt(text); //callback so we have access to the text contents
    }
  });
}

function getPrompt(text) {

  var prompt_choice; //the prompt we end up returning to choose the directory

  //grab only the text in the first sentence - has to have a period at the end
  var sentences = text.split("."); 

  prompt = sentences[0]; //prompt is the first sentence
  console.log('Prompt extracted from OCR: ' + prompt);

  //use switch statement to evaluate prompt sentence and get short code
  switch (prompt) {
    case 'Describe a memory involving a mirror':
      prompt_choice = 'mirrors';
      break;
    case 'Describe a memory about a lie you told':
      prompt_choice = 'lies';
      break;
    case 'Describe a memory of a time you lost something':
      prompt_choice = 'lost';
      break;
    case 'Describe a memory of climbing something':
      prompt_choice = 'climbing';
      break;
    case 'Describe a memory of a depressing song':
      prompt_choice = 'song';
      break;
    default:
      prompt_choice = 'noprompt';

  }

  console.log('Short code for prompt choice from if / else statement: ' + prompt_choice);

  sendRandomFileToPrinter(processedDir + '/' + prompt_choice);

  //need a variable for the file that's coming in
  copyToDirectory('scans_incoming/img20160401_18485819.jpg', 'scans_processed/' + prompt_choice);

}


function sendRandomFileToPrinter(folder) {

  // console.log('folder name: ' + folder);

  //get list of everything in folder within scans_processed - use junk module to filter out . files
  var filenames = fs.readdirSync(folder); 
  filenames = filenames.filter(junk.not);

 //pick a random file
  var index = Math.floor(Math.random()*filenames.length);
  var file_choice = filenames[index];
  console.log('File choice of new memory: ' + file_choice);


  // send output file to the printer - from this example https://github.com/tojocky/node-printer/tree/master/examples
  if( process.platform != 'win32') {
    console.log('file to print: ' + folder + '/' + file_choice);
    printer.printFile({filename: folder + '/' + file_choice,  // FIX THIS SO ITS DYNAMIC
      printer: my_printer, // printer name, if missing then will print to default printer
      success:function(jobID){
        console.log("sent to printer " + my_printer + " with ID: "+jobID);
      },
      error:function(err){
        console.log(err);
      }
    });
  } 
  
}

//copy the file, move it to the right directory in scans_processed so it can become an output
function copyToDirectory(filePath, folder) {

  console.log('file path: ' + filePath);
  console.log('folder: ' + folder);

  //*************
  //****FIX THIS - it's saving the new file to the folder where the scans are coming in and it's fucking everything up
  //first copy the file, take filePath (original name) and copy it, rename it newFileName
  var fileWithoutDirectory = filePath.split('/')[1];
  // console.log(fileWithoutDirectory);
  var newFileName = folder + '/' + fileWithoutDirectory.split('.')[0] + '_processed.jpg';
  console.log('new file name: ' + newFileName);

  //then copy and move the file to the appropriate folder 
  fs.copy(filePath, newFileName, { replace: false }, function (err) {
    if (err) {
      // i.e. file already exists or can't write to directory 
      throw err;
    }
    console.log('Copied ' + filePath + ' to ' + newFileName);
  });

  

}




