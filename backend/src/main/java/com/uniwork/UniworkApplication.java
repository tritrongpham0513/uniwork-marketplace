package com.uniwork;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class UniworkApplication {

    public static void main(String[] args) {
        SpringApplication.run(UniworkApplication.class, args);
        System.out.println("=================================================");
        System.out.println("   UNIWORK BACKEND API SERVER STARTED SUCCESS   ");
        System.out.println("   Base URL: http://localhost:8080/api           ");
        System.out.println("=================================================");
    }
}

