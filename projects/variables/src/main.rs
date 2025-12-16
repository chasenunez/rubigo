fn main() {
    let tup: (i32, f64, u8) = (500, 6.4, 1);
    let fivehundred = tup.0;
    let sixpointfour = tup.1;
    let one = tup.2;
    println!("{fivehundred}, and then {sixpointfour}, and finally {one}");
}

How is wikipedia coded? how is it structured? how is it managed? how can a wikipedia like software be written simply?
How is Obsidian coded? how is it structured? how is it managed? how can a obsidian like software be written simply?

Write a program called "Mnemosyne" that has the main function of recording family geneology and memories in markdown format, and linking between pages. 
It will mimic wikipedia in the sense that all pages will be referenced within other pages. For instance, a page for Plato will include a description that he contributed to the field of Philosophy, and the word "philosophy" will take the user via hyperlink to a markdown page for philosophy.
It will mimic obsidian in that it should create markdown pages with standerdized formatting that are linked to one another by hyperlinks that can be automatically generated while the user is typing. for example, if I am writing the word "philosophy" the program will recognize that the word is the title of an existing page, and will make a suggestion, and if the use accepts, it will automatically create a hyperlink. 
The main page will be called the "network" page that shows each page as a node, with connections to any page that it has a hyper link to, or any pages that hyperlink to it. 

A new user will have to create an account with an email account and a password.
That account will have to be approved by the admin before they can add or edit ar see any information.
Once they are approved, and they log in using their credential, they will be directed to a simple page that simply asks if they want to write entries or explore existing entries.

if they choose write entries, they are taken to a simple page where they must select the format of the entry from a set of archetypal assets. for example, a drop down menu with option for "person", "place", "thing", or "memory"
if person is selected, they are directed to a page with fields for personal information. For example: "First Name", "Last Name", "Maiden Name", "Birthdate", "Birthplace", "places lived", "Parents", "Children", "Occupation", etc. There will also be a place to upload photos. Importantly, all these fields should also link to existing pages for those people or places, but if they do not exist, ask the user if they should be created. if fields are left empty, the user is asked if that is intentional. If yes, then the entry is saved as a markdown document.
if place is selected, there should be a field for location, which can be selected using an interactive map where they can enter an address, longitude and latitude, or drop a pin. There should be fields for a description, to photos, and also memeories associated with that places
if thing is selected, there should be a field for a description, photo upload, and a memory associated with that thing. 
If memory is selected, there should fields where they can select the people, places, and things that are a part of that memory. for

in the back end of the program, each of these assets should be its own separate markdown document located within a file for it s domain (for example, if a user creates a Person asset named "Abe Lincoln", the filepath would be Abe Lincoln.md will be)