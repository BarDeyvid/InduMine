package com.indumine.backend;

import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import javax.sql.DataSource;
import java.sql.Connection;

@SpringBootTest
class ConexaoBancoTest {

    @Autowired
    private DataSource dataSource;

    @Entity
    @Table(name = "users")
    public static class User {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "username")
        private String name;
    }

    @Test
    void testarConexao() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            System.out.println("CONECTADO COM SUCESSO AO MYSQL!");
        }
    }
}