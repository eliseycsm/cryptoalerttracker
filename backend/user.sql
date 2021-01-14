drop database if exists stockusers;

create database stockusers;

use stockusers;


create table users (
	user_id int not null auto_increment,
	username varchar(64) not null,
	password varchar(64) not null,
    email varchar(64) not null unique,
	primary key(user_id)
);

insert into users(username, password, email) values
	('fred', sha1('fred'), 'fred@gmail.com'),
	('wilma', sha1('wilma'), 'wilma@gmail.com'),
	('barney', sha1('barney'), 'barney@gmail.com'),
	('betty', sha1('betty'), 'betty@gmail.com');